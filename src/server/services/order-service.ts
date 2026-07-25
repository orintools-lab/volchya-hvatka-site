import { randomInt } from "node:crypto";
import { db } from "@/lib/db/client";
import { RobokassaPaymentProvider } from "@/lib/payments/robokassa";
import { revalidateDeliveryQuote } from "./delivery-service";
import { sendPaidOrderNotifications } from "@/lib/notifications/email";

function orderNumber() {
  const date = new Date();
  return `VH-${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}-${randomInt(100000, 999999)}`;
}

async function uniqueInvoiceId() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = randomInt(1000000, 2147483647);
    const exists = await db.payment.findUnique({ where: { invoiceId: candidate } });
    if (!exists) return candidate;
  }
  throw new Error("Не удалось сформировать номер счёта.");
}

export async function createOrder(input: {
  quoteId: string;
  customerName: string;
  phone: string;
  email: string;
  postalCode?: string;
  shashkaSize: "ADULT" | "TEEN" | "CHILD" | "BY_HEIGHT";
  customerHeight?: number;
  comment?: string;
  utm?: Record<string, string>;
}) {
  const quote = await revalidateDeliveryQuote(input.quoteId);
  const product = await db.product.findFirst({
    where: { id: quote.productId, isActive: true },
  });
  if (!product) throw new Error("Товар больше недоступен.");

  const subtotal = product.price.mul(quote.quantity);
  const total = subtotal.add(quote.price);
  const invoiceId = await uniqueInvoiceId();
  const idempotencyKey = `robokassa:${invoiceId}`;

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
        deliveryMethod: "CDEK",
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
        shashkaSize: input.shashkaSize,
        customerHeight: input.customerHeight,
        customerComment: input.comment,
        subtotal,
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
            total: subtotal,
          },
        },
      },
    });
    const payment = await transaction.payment.create({
      data: {
        orderId: order.id,
        provider: "robokassa",
        invoiceId,
        idempotencyKey,
        status: "PENDING",
        amount: total,
      },
    });
    return { order, payment };
  });

  const paymentUrl = new RobokassaPaymentProvider().createPaymentUrl({
    invoiceId,
    amount: total.toFixed(2),
    description: `Оплата заказа ${result.order.number}`,
    email: result.order.email,
  });
  return {
    orderId: result.order.id,
    orderNumber: result.order.number,
    paymentUrl,
    total: total.toFixed(2),
  };
}

export async function processRobokassaResult(input: {
  amount: string;
  invoiceId: number;
  signature: string;
  payload: Record<string, string>;
}) {
  const provider = new RobokassaPaymentProvider();
  if (!provider.verifyResult(input)) throw new Error("Некорректная подпись.");

  const payment = await db.payment.findUnique({
    where: { invoiceId: input.invoiceId },
    include: { order: true },
  });
  if (!payment) throw new Error("Платёж не найден.");
  if (payment.amount.toFixed(2) !== Number(input.amount).toFixed(2)) {
    throw new Error("Сумма платежа не совпадает.");
  }
  if (payment.status === "SUCCEEDED") return `OK${input.invoiceId}`;

  await db.$transaction(async (transaction) => {
    const current = await transaction.payment.findUniqueOrThrow({
      where: { id: payment.id },
    });
    if (current.status === "SUCCEEDED") return;
    await transaction.payment.update({
      where: { id: payment.id },
      data: { status: "SUCCEEDED", payload: input.payload },
    });
    await transaction.paymentEvent.create({
      data: {
        paymentId: payment.id,
        externalEventId: `result:${input.invoiceId}`,
        eventType: "ROBOKASSA_RESULT",
        payload: input.payload,
      },
    });
    await transaction.order.update({
      where: { id: payment.orderId },
      data: { status: "PAID" },
    });
    await transaction.auditLog.create({
      data: {
        action: "PAYMENT_CONFIRMED",
        entity: "Order",
        entityId: payment.orderId,
        after: { invoiceId: input.invoiceId, amount: input.amount },
      },
    });
  });
  const paidOrder = await db.order.findUniqueOrThrow({
    where: { id: payment.orderId },
    include: { items: true },
  });
  try {
    const notification = await sendPaidOrderNotifications({
      number: paidOrder.number,
      customerName: paidOrder.customerName,
      phone: paidOrder.phone,
      email: paidOrder.email,
      products: paidOrder.items.map((item) => `${item.productName} × ${item.quantity}`).join(", "),
      amount: paidOrder.total.toFixed(2),
      delivery: `${paidOrder.cdekTariffName}: ${paidOrder.cdekPointAddress ?? paidOrder.deliveryAddress}`,
    });
    await db.auditLog.create({
      data: {
        action: notification.sent ? "PAYMENT_EMAIL_SENT" : "PAYMENT_EMAIL_SKIPPED",
        entity: "Order",
        entityId: paidOrder.id,
        after: notification,
      },
    });
  } catch (error) {
    await db.auditLog.create({
      data: {
        action: "PAYMENT_EMAIL_FAILED",
        entity: "Order",
        entityId: paidOrder.id,
        after: { message: error instanceof Error ? error.message : "Unknown email error" },
      },
    });
  }
  return `OK${input.invoiceId}`;
}
