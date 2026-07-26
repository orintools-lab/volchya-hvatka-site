import { randomInt } from "node:crypto";
import { db } from "@/lib/db/client";
import { RobokassaPaymentProvider } from "@/lib/payments/robokassa";
import { sendPaidOrderNotifications } from "@/lib/notifications/email";
import { revalidateDeliveryQuote } from "./delivery-service";
import { findLengthRecommendation } from "./length-service";
import { manualOrderState, SHASHKA_MATERIAL } from "./manual-order";

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

export async function createOrder(input: CreateOrderInput) {
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
  if (!recommendation && input.customerHeight >= 100) {
    throw new Error("Для указанного роста длина пока не настроена.");
  }
  if (input.customerHeight < 100 && input.deliveryProvider !== "MANUAL") {
    throw new Error("Для роста менее 100 см доступно только индивидуальное согласование.");
  }

  if (input.deliveryProvider === "MANUAL") {
    const order = await db.order.create({
      data: {
        number: orderNumber(),
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
      message: "Заявка принята. Мы свяжемся с вами, согласуем доставку и отправим ссылку на оплату.",
    };
  }

  if (!input.quoteId) throw new Error("Подтвердите способ доставки.");
  if (!recommendation) throw new Error("Для указанного роста длина пока не настроена.");
  const quote = await revalidateDeliveryQuote(input.quoteId);
  if (quote.productId !== product.id) throw new Error("Состав заказа изменился. Повторите расчёт.");
  const cdekSubtotal = product.price.mul(quote.quantity);
  const total = cdekSubtotal.add(quote.price);
  const invoiceId = await uniqueInvoiceId();

  const result = await db.$transaction(async (transaction) => {
    const order = await transaction.order.create({
      data: {
        number: orderNumber(),
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
    const payment = await transaction.payment.create({
      data: {
        orderId: order.id,
        provider: "robokassa",
        invoiceId,
        idempotencyKey: `robokassa:${invoiceId}`,
        status: "PENDING",
        amount: total,
      },
    });
    return { order, payment };
  });
  return {
    orderId: result.order.id,
    orderNumber: result.order.number,
    requiresPayment: true,
    paymentUrl: new RobokassaPaymentProvider().createPaymentUrl({
      invoiceId,
      amount: total.toFixed(2),
      description: `Оплата заказа ${result.order.number}`,
      email: result.order.email,
    }),
    total: total.toFixed(2),
  };
}

export async function createPaymentForAgreedOrder(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order || !order.total || order.deliveryAgreementStatus !== "AGREED") {
    throw new Error("Сначала согласуйте стоимость доставки.");
  }
  const existing = order.payments.find((payment) => payment.status === "PENDING");
  if (existing?.providerPaymentId) return existing.providerPaymentId;
  const invoiceId = existing?.invoiceId ?? await uniqueInvoiceId();
  const paymentUrl = new RobokassaPaymentProvider().createPaymentUrl({
    invoiceId,
    amount: order.total.toFixed(2),
    description: `Оплата заказа ${order.number}`,
    email: order.email,
  });
  if (existing) {
    await db.payment.update({ where: { id: existing.id }, data: { providerPaymentId: paymentUrl } });
  } else {
    await db.payment.create({
      data: {
        orderId,
        provider: "robokassa",
        invoiceId,
        idempotencyKey: `robokassa:${invoiceId}`,
        status: "PENDING",
        amount: order.total,
        providerPaymentId: paymentUrl,
      },
    });
  }
  return paymentUrl;
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
  const payment = await db.payment.findUnique({ where: { invoiceId: input.invoiceId }, include: { order: true } });
  if (!payment) throw new Error("Платёж не найден.");
  if (!payment.amount.equals(input.amount)) throw new Error("Сумма платежа не совпадает.");
  if (payment.status === "SUCCEEDED") return `OK${input.invoiceId}`;

  const processed = await db.$transaction(async (transaction) => {
    const claimed = await transaction.payment.updateMany({
      where: { id: payment.id, status: { not: "SUCCEEDED" } },
      data: { status: "SUCCEEDED", payload: input.payload },
    });
    if (claimed.count === 0) return false;
    await transaction.paymentEvent.create({
      data: { paymentId: payment.id, externalEventId: `result:${input.invoiceId}`, eventType: "ROBOKASSA_RESULT", payload: input.payload },
    });
    await transaction.order.update({ where: { id: payment.orderId }, data: { status: "PAID" } });
    await transaction.auditLog.create({
      data: { action: "PAYMENT_CONFIRMED", entity: "Order", entityId: payment.orderId, after: { invoiceId: input.invoiceId, amount: input.amount } },
    });
    return true;
  });
  if (!processed) return `OK${input.invoiceId}`;
  const paidOrder = await db.order.findUniqueOrThrow({ where: { id: payment.orderId }, include: { items: true } });
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
