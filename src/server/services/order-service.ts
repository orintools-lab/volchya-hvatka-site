import { randomInt } from "node:crypto";
import { db } from "@/lib/db/client";
import { RobokassaPaymentProvider } from "@/lib/payments/robokassa";
import { sendPaidOrderNotifications } from "@/lib/notifications/email";
import { revalidateDeliveryQuote } from "./delivery-service";
import { findLengthRecommendation } from "./length-service";
import { manualOrderState, SHASHKA_MATERIAL } from "./manual-order";
import { createUpsellAfterPayment } from "./upsell-service";
import {
  grantMasterAccessForOrder,
  grantMasterAccessForUpsell,
  grantStartAccess,
} from "./course-access-service";
import { requestMagicLink } from "./customer-auth-service";
import {
  checkoutPaymentPolicy,
  getCheckoutPaymentMode,
  getPaymentLinkExpiryHours,
} from "./checkout-payment-mode";
import {
  createPaymentToken,
  decryptPaymentToken,
  isPaymentLinkExpired,
  paymentLinkExpiry,
  publicPaymentUrl,
} from "./payment-link";
import { deliverCourseAfterPayment } from "./digital-delivery-service";

const MATERIAL = SHASHKA_MATERIAL;

function orderNumber() {
  const date = new Date();
  return `VH-${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}-${randomInt(100000, 999999)}`;
}

async function uniqueInvoiceId() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = randomInt(1000000, 2147483647);
    if (!(await db.payment.findUnique({ where: { invoiceId: candidate } }))) return candidate;
  }
  throw new Error("Не удалось сформировать номер счёта.");
}

type CreateOrderInput = {
  checkoutIdempotencyKey: string;
  productId: string;
  deliveryProvider: "CDEK" | "OZON" | "MANUAL";
  quoteId?: string;
  customerName: string;
  phone: string;
  email: string;
  postalCode?: string;
  customerHeight: number;
  comment?: string;
  utm?: Record<string, string>;
};

async function existingCheckoutResponse(checkoutIdempotencyKey: string) {
  const existing = await db.order.findUnique({
    where: { checkoutIdempotencyKey },
    include: {
      items: { take: 1 },
      payments: {
        where: { status: "PENDING", type: "ORDER" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!existing) return null;
  const payment = existing.payments[0];
  if (payment?.providerPaymentId) {
    return {
      orderId: existing.id,
      orderNumber: existing.number,
      requiresPayment: true,
      paymentUrl: payment.providerPaymentId,
      total: existing.total?.toFixed(2) ?? payment.amount.toFixed(2),
    };
  }
  const item = existing.items[0];
  return {
    orderId: existing.id,
    orderNumber: existing.number,
    requiresPayment: false,
    total: existing.total?.toFixed(2) ?? null,
    productName: item?.productName ?? "",
    customerHeight: existing.customerHeight,
    recommendedLengthCm: existing.recommendedLengthCm,
    material: existing.material,
    message: "Заявка принята. Мы свяжемся с вами для согласования доставки и отправим ссылку на оплату.",
  };
}

async function createOrderOnce(input: CreateOrderInput) {
  const existing = await existingCheckoutResponse(input.checkoutIdempotencyKey);
  if (existing) return existing;
  if (input.deliveryProvider === "OZON") {
    throw new Error("Этот способ доставки пока недоступен.");
  }
  const product = await db.product.findFirst({ where: { id: input.productId, isActive: true } });
  if (!product) throw new Error("Товар больше недоступен.");
  const rules = await db.lengthRule.findMany({
    where: { isActive: true },
    orderBy: [{ minHeightCm: "asc" }, { sortOrder: "asc" }],
  });
  const recommendation = findLengthRecommendation(rules, input.customerHeight);
  const subtotal = product.price;
  const paymentMode = await getCheckoutPaymentMode();
  const paymentPolicy = checkoutPaymentPolicy({
    mode: paymentMode,
    deliveryProvider: input.deliveryProvider,
  });
  if (!recommendation && input.customerHeight >= 100) {
    throw new Error("Для указанного роста длина пока не настроена.");
  }
  if (input.customerHeight < 100 && input.deliveryProvider !== "MANUAL") {
    throw new Error("Для роста менее 100 см доступно только индивидуальное согласование.");
  }

  if (input.deliveryProvider === "MANUAL") {
    if (!paymentPolicy.payImmediately) {
      const order = await db.order.create({
        data: {
          number: orderNumber(),
          checkoutIdempotencyKey: input.checkoutIdempotencyKey,
          ...manualOrderState({
            customerHeight: input.customerHeight,
            recommendedLengthCm: recommendation?.lengthCm,
          }),
          customerName: input.customerName,
          phone: input.phone,
          email: input.email,
          postalCode: input.postalCode,
          shashkaSize: "BY_HEIGHT",
          customerComment: input.comment,
          subtotal,
          utm: input.utm,
          items: {
            create: {
              productId: product.id,
              productName: product.name,
              productSlug: product.slug,
              unitPrice: product.price,
              quantity: 1,
              total: subtotal,
              recommendedLengthCm: recommendation?.lengthCm,
              actualLengthCm: recommendation?.lengthCm,
              shashkaCount: 2,
              material: MATERIAL,
            },
          },
        },
      });
      return {
        orderId: order.id,
        orderNumber: order.number,
        requiresPayment: false,
        total: null,
        productName: product.name,
        customerHeight: input.customerHeight,
        recommendedLengthCm: recommendation?.lengthCm ?? null,
        material: MATERIAL,
        message: "Заявка принята. Мы свяжемся с вами для согласования доставки и отправим ссылку на оплату.",
      };
    }

    const invoiceId = await uniqueInvoiceId();
    const linkToken = createPaymentToken();
    const linkExpiresAt = paymentLinkExpiry(await getPaymentLinkExpiryHours());
    const immediate = await db.$transaction(async (transaction) => {
      const order = await transaction.order.create({
        data: {
          number: orderNumber(),
          checkoutIdempotencyKey: input.checkoutIdempotencyKey,
          status: paymentPolicy.orderStatus,
          deliveryProvider: "MANUAL",
          deliveryAgreementStatus: paymentPolicy.deliveryAgreementStatus,
          deliveryPrice: 0,
          total: subtotal,
          customerName: input.customerName,
          phone: input.phone,
          email: input.email,
          postalCode: input.postalCode,
          shashkaSize: "BY_HEIGHT",
          customerHeight: input.customerHeight,
          recommendedLengthCm: recommendation?.lengthCm,
          actualLengthCm: recommendation?.lengthCm,
          shashkaCount: 2,
          material: MATERIAL,
          customerComment: input.comment,
          subtotal,
          utm: input.utm,
          items: {
            create: {
              productId: product.id,
              productName: product.name,
              productSlug: product.slug,
              unitPrice: product.price,
              quantity: 1,
              total: subtotal,
              recommendedLengthCm: recommendation?.lengthCm,
              actualLengthCm: recommendation?.lengthCm,
              shashkaCount: 2,
              material: MATERIAL,
            },
          },
        },
      });
      const paymentUrl = new RobokassaPaymentProvider().createPaymentUrl({
        invoiceId,
        amount: subtotal.toFixed(2),
        description: `Оплата заказа ${order.number}`,
        email: order.email,
      });
      await transaction.payment.create({
        data: {
          orderId: order.id,
          provider: "robokassa",
          invoiceId,
          idempotencyKey: `robokassa:${invoiceId}`,
          status: "PENDING",
          amount: subtotal,
          providerPaymentId: paymentUrl,
          type: "ORDER",
          paymentLinkTokenHash: linkToken.hash,
          paymentLinkTokenEncrypted: linkToken.encrypted,
          paymentLinkExpiresAt: linkExpiresAt,
        },
      });
      return { order, paymentUrl };
    });
    return {
      orderId: immediate.order.id,
      orderNumber: immediate.order.number,
      requiresPayment: true,
      paymentUrl: immediate.paymentUrl,
      total: subtotal.toFixed(2),
    };
  }

  if (!input.quoteId) throw new Error("Подтвердите способ доставки.");
  if (!recommendation) throw new Error("Для указанного роста длина пока не настроена.");
  const quote = await revalidateDeliveryQuote(input.quoteId);
  if (quote.productId !== product.id) throw new Error("Состав заказа изменился. Повторите расчёт.");
  const cdekSubtotal = product.price.mul(quote.quantity);
  const total = cdekSubtotal.add(quote.price);
  const invoiceId = await uniqueInvoiceId();
  const linkToken = createPaymentToken();
  const linkExpiresAt = paymentLinkExpiry(await getPaymentLinkExpiryHours());

  const result = await db.$transaction(async (transaction) => {
    const order = await transaction.order.create({
      data: {
        number: orderNumber(),
        checkoutIdempotencyKey: input.checkoutIdempotencyKey,
        status: "AWAITING_PAYMENT",
        customerName: input.customerName,
        phone: input.phone,
        email: input.email,
        city: quote.cityName,
        postalCode: input.postalCode,
        deliveryProvider: "CDEK",
        deliveryType: quote.deliveryType,
        deliveryAddress: quote.address ?? quote.pointAddress,
        cdekCityCode: quote.cityCode,
        cdekPointCode: quote.pointCode,
        cdekPointName: quote.pointName,
        cdekPointAddress: quote.pointAddress,
        cdekTariffCode: quote.tariffCode,
        cdekTariffName: quote.tariffName,
        deliveryMinDays: quote.minDays,
        deliveryMaxDays: quote.maxDays,
        deliveryQuoteId: quote.id,
        deliveryQuotedAt: new Date(),
        shashkaSize: "BY_HEIGHT",
        customerHeight: input.customerHeight,
        recommendedLengthCm: recommendation.lengthCm,
        actualLengthCm: recommendation.lengthCm,
        shashkaCount: 2,
        material: MATERIAL,
        customerComment: input.comment,
        subtotal: cdekSubtotal,
        deliveryPrice: quote.price,
        total,
        utm: input.utm,
        items: {
          create: {
            productId: product.id,
            productName: product.name,
            productSlug: product.slug,
            unitPrice: product.price,
            quantity: quote.quantity,
            total: cdekSubtotal,
            recommendedLengthCm: recommendation.lengthCm,
            actualLengthCm: recommendation.lengthCm,
            shashkaCount: 2,
            material: MATERIAL,
          },
        },
      },
    });
    const paymentUrl = new RobokassaPaymentProvider().createPaymentUrl({
      invoiceId,
      amount: total.toFixed(2),
      description: `Оплата заказа ${order.number}`,
      email: order.email,
    });
    const payment = await transaction.payment.create({
      data: {
        orderId: order.id,
        provider: "robokassa",
        invoiceId,
        idempotencyKey: `robokassa:${invoiceId}`,
        status: "PENDING",
        amount: total,
        type: "ORDER",
        paymentLinkTokenHash: linkToken.hash,
        paymentLinkTokenEncrypted: linkToken.encrypted,
        paymentLinkExpiresAt: linkExpiresAt,
        providerPaymentId: paymentUrl,
      },
    });
    return { order, payment, paymentUrl };
  });
  return {
    orderId: result.order.id,
    orderNumber: result.order.number,
    requiresPayment: true,
    paymentUrl: result.paymentUrl,
    total: total.toFixed(2),
  };
}

export async function createOrder(input: CreateOrderInput) {
  try {
    return await createOrderOnce(input);
  } catch (error) {
    const prismaError = error as { code?: string };
    if (prismaError?.code === "P2002") {
      const existing = await existingCheckoutResponse(input.checkoutIdempotencyKey);
      if (existing) return existing;
    }
    throw error;
  }
}

export async function createPaymentForAgreedOrder(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (order?.status === "PAID") throw new Error("Заказ уже оплачен");
  if (!order || !order.total || order.deliveryAgreementStatus !== "AGREED") {
    throw new Error("Сначала согласуйте стоимость доставки.");
  }
  const existing = order.payments.find((payment) => payment.status === "PENDING" && payment.type === "ORDER");
  if (existing && isPaymentLinkExpired(existing.paymentLinkExpiresAt)) {
    await db.payment.update({ where: { id: existing.id }, data: { status: "EXPIRED" } });
  } else if (existing?.providerPaymentId && existing.paymentLinkTokenEncrypted) {
    return publicPaymentUrl(decryptPaymentToken(existing.paymentLinkTokenEncrypted));
  }
  const invoiceId = await uniqueInvoiceId();
  const linkToken = createPaymentToken();
  const linkExpiresAt = paymentLinkExpiry(await getPaymentLinkExpiryHours());
  const paymentUrl = new RobokassaPaymentProvider().createPaymentUrl({
    invoiceId,
    amount: order.total.toFixed(2),
    description: `Оплата заказа ${order.number}`,
    email: order.email,
  });
  await db.payment.create({
    data: {
      orderId,
      provider: "robokassa",
      invoiceId,
      idempotencyKey: `robokassa:${invoiceId}`,
      status: "PENDING",
      type: "ORDER",
      amount: order.total,
      providerPaymentId: paymentUrl,
      paymentLinkTokenHash: linkToken.hash,
      paymentLinkTokenEncrypted: linkToken.encrypted,
      paymentLinkExpiresAt: linkExpiresAt,
    },
  });
  return publicPaymentUrl(linkToken.token);
}

export async function createDeliveryPayment(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order || !order.deliveryPrice || order.deliveryPrice.lte(0) || order.deliveryAgreementStatus !== "AGREED") {
    throw new Error("Сначала согласуйте ненулевую стоимость доставки.");
  }
  const existing = order.payments.find((payment) => payment.status === "PENDING" && payment.type === "DELIVERY");
  if (existing && isPaymentLinkExpired(existing.paymentLinkExpiresAt)) {
    await db.payment.update({ where: { id: existing.id }, data: { status: "EXPIRED" } });
  } else if (existing?.providerPaymentId && existing.paymentLinkTokenEncrypted) {
    return publicPaymentUrl(decryptPaymentToken(existing.paymentLinkTokenEncrypted));
  }
  const invoiceId = await uniqueInvoiceId();
  const linkToken = createPaymentToken();
  const linkExpiresAt = paymentLinkExpiry(await getPaymentLinkExpiryHours());
  const paymentUrl = new RobokassaPaymentProvider().createPaymentUrl({
    invoiceId,
    amount: order.deliveryPrice.toFixed(2),
    description: `Оплата доставки заказа ${order.number}`,
    email: order.email,
  });
  await db.payment.create({
    data: {
      orderId,
      provider: "robokassa",
      invoiceId,
      idempotencyKey: `robokassa:delivery:${order.id}:${invoiceId}`,
      status: "PENDING",
      type: "DELIVERY",
      amount: order.deliveryPrice,
      providerPaymentId: paymentUrl,
      payload: { purpose: "DELIVERY" },
      paymentLinkTokenHash: linkToken.hash,
      paymentLinkTokenEncrypted: linkToken.encrypted,
      paymentLinkExpiresAt: linkExpiresAt,
    },
  });
  return publicPaymentUrl(linkToken.token);
}

export async function processRobokassaResult(input: {
  amount: string;
  invoiceId: number;
  signature: string;
  payload: Record<string, string>;
}) {
  const provider = new RobokassaPaymentProvider();
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(input.amount)) throw new Error("Некорректная сумма платежа.");
  if (!provider.verifyResult(input)) throw new Error("Некорректная подпись.");
  const payment = await db.payment.findUnique({
    where: { invoiceId: input.invoiceId },
    include: { order: true, upsellOffer: true },
  });
  if (!payment) throw new Error("Платёж не найден.");
  if (!payment.amount.equals(input.amount)) throw new Error("Сумма платежа не совпадает.");
  const isDeliveryPayment = typeof payment.payload === "object" &&
    payment.payload !== null &&
    !Array.isArray(payment.payload) &&
    (payment.payload as { purpose?: unknown }).purpose === "DELIVERY";
  if (payment.status === "SUCCEEDED") {
    try {
      if (payment.upsellOfferId) {
        await grantMasterAccessForUpsell(payment.upsellOfferId);
        const offer = await db.upsellOffer.findUnique({ where: { id: payment.upsellOfferId } });
        if (offer) await deliverCourseAfterPayment({ orderId: offer.orderId, courseSlug: "master" });
      } else if (payment.orderId && !isDeliveryPayment) {
        await grantStartAccess(payment.orderId);
        await grantMasterAccessForOrder(payment.orderId);
        const order = await db.order.findUnique({ where: { id: payment.orderId }, include: { items: true } });
        if (order?.items.some((item) => item.productSlug === "start")) {
          await deliverCourseAfterPayment({ orderId: payment.orderId, courseSlug: "start" });
        }
        if (order?.items.some((item) => item.productSlug === "master")) {
          await deliverCourseAfterPayment({ orderId: payment.orderId, courseSlug: "master" });
        }
      }
    } catch {}
    return `OK${input.invoiceId}`;
  }

  const processed = await db.$transaction(async (transaction) => {
    const claimed = await transaction.payment.updateMany({
      where: { id: payment.id, status: { not: "SUCCEEDED" } },
      data: {
        status: "SUCCEEDED",
        paidAt: new Date(),
        payload: isDeliveryPayment ? { ...input.payload, purpose: "DELIVERY" } : input.payload,
      },
    });
    if (claimed.count === 0) return false;
    await transaction.paymentEvent.create({
      data: { paymentId: payment.id, externalEventId: `result:${input.invoiceId}`, eventType: "ROBOKASSA_RESULT", payload: input.payload },
    });
    if (payment.upsellOfferId) {
      await transaction.upsellOffer.update({
        where: { id: payment.upsellOfferId },
        data: { status: "ACCEPTED", usedAt: new Date() },
      });
      await transaction.auditLog.create({
        data: { action: "UPSELL_PAYMENT_CONFIRMED", entity: "UpsellOffer", entityId: payment.upsellOfferId, after: { invoiceId: input.invoiceId, amount: input.amount } },
      });
    } else if (!isDeliveryPayment) {
      if (!payment.orderId || !payment.order) throw new Error("Заказ платежа не найден.");
      await transaction.order.update({ where: { id: payment.orderId }, data: { status: "PAID" } });
      await transaction.auditLog.create({
        data: { action: "PAYMENT_CONFIRMED", entity: "Order", entityId: payment.orderId, after: { invoiceId: input.invoiceId, amount: input.amount } },
      });
    }
    return true;
  });
  if (!processed) return `OK${input.invoiceId}`;
  if (isDeliveryPayment) return `OK${input.invoiceId}`;
  if (payment.upsellOfferId) {
    try {
      await grantMasterAccessForUpsell(payment.upsellOfferId);
      const offer = await db.upsellOffer.findUnique({ where: { id: payment.upsellOfferId } });
      if (offer) await deliverCourseAfterPayment({ orderId: offer.orderId, courseSlug: "master" });
    } catch {}
    return `OK${input.invoiceId}`;
  }
  if (!payment.orderId) throw new Error("Заказ платежа не найден.");
  const paidOrder = await db.order.findUniqueOrThrow({ where: { id: payment.orderId }, include: { items: true } });
  if (
    paidOrder.deliveryProvider === "MANUAL" &&
    paidOrder.deliveryAgreementStatus === "AGREED" &&
    paidOrder.deliveryPrice?.gt(0)
  ) {
    try {
      await createDeliveryPayment(paidOrder.id);
    } catch (error) {
      await db.auditLog.create({
        data: {
          action: "DELIVERY_PAYMENT_LINK_FAILED",
          entity: "Order",
          entityId: paidOrder.id,
          after: { message: error instanceof Error ? error.message : "Unknown delivery payment error" },
        },
      });
    }
  }
  try {
    await grantStartAccess(paidOrder.id);
    await grantMasterAccessForOrder(paidOrder.id);
    if (paidOrder.items.some((item) => item.productSlug === "start")) {
      await deliverCourseAfterPayment({ orderId: paidOrder.id, courseSlug: "start" });
    }
    if (paidOrder.items.some((item) => item.productSlug === "master")) {
      await deliverCourseAfterPayment({ orderId: paidOrder.id, courseSlug: "master" });
    }
    await requestMagicLink(paidOrder.email);
  } catch (error) {
    await db.auditLog.create({
      data: {
        action: "COURSE_ACCESS_OR_MAGIC_LINK_FAILED",
        entity: "Order",
        entityId: paidOrder.id,
        after: { message: error instanceof Error ? error.message : "Unknown access error" },
      },
    });
  }
  try {
    await createUpsellAfterPayment(paidOrder.id);
  } catch (error) {
    await db.auditLog.create({
      data: {
        action: "UPSELL_CREATION_FAILED",
        entity: "Order",
        entityId: paidOrder.id,
        after: { message: error instanceof Error ? error.message : "Unknown upsell error" },
      },
    });
  }
  try {
    const notification = await sendPaidOrderNotifications({
      number: paidOrder.number,
      customerName: paidOrder.customerName,
      phone: paidOrder.phone,
      email: paidOrder.email,
      products: paidOrder.items.map((item) => `${item.productName} × ${item.quantity}`).join(", "),
      amount: paidOrder.total?.toFixed(2) ?? "не согласована",
      delivery: paidOrder.deliveryProvider === "CDEK"
        ? `${paidOrder.cdekTariffName}: ${paidOrder.cdekPointAddress ?? paidOrder.deliveryAddress}`
        : "Доставка по согласованию",
    });
    await db.auditLog.create({
      data: { action: notification.sent ? "PAYMENT_EMAIL_SENT" : "PAYMENT_EMAIL_SKIPPED", entity: "Order", entityId: paidOrder.id, after: notification },
    });
  } catch (error) {
    await db.auditLog.create({
      data: { action: "PAYMENT_EMAIL_FAILED", entity: "Order", entityId: paidOrder.id, after: { message: error instanceof Error ? error.message : "Unknown email error" } },
    });
  }
  return `OK${input.invoiceId}`;
}
