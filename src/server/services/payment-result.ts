import type { Prisma } from "@prisma/client";

export async function claimSuccessfulRobokassaPayment(
  transaction: Prisma.TransactionClient,
  input: {
    paymentId: string;
    orderId: string | null;
    upsellOfferId: string | null;
    invoiceId: number;
    amount: string;
    payload: Record<string, string>;
    isDeliveryPayment: boolean;
  },
) {
  const claimed = await transaction.payment.updateMany({
    where: { id: input.paymentId, status: { not: "SUCCEEDED" } },
    data: {
      status: "SUCCEEDED",
      paidAt: new Date(),
      payload: input.isDeliveryPayment
        ? { ...input.payload, purpose: "DELIVERY" }
        : input.payload,
    },
  });
  if (claimed.count === 0) return false;

  await transaction.paymentEvent.create({
    data: {
      paymentId: input.paymentId,
      externalEventId: `result:${input.invoiceId}`,
      eventType: "ROBOKASSA_RESULT",
      payload: input.payload,
    },
  });
  if (input.upsellOfferId) {
    await transaction.upsellOffer.update({
      where: { id: input.upsellOfferId },
      data: { status: "ACCEPTED", usedAt: new Date() },
    });
    await transaction.auditLog.create({
      data: {
        action: "UPSELL_PAYMENT_CONFIRMED",
        entity: "UpsellOffer",
        entityId: input.upsellOfferId,
        after: { invoiceId: input.invoiceId, amount: input.amount },
      },
    });
  } else if (!input.isDeliveryPayment) {
    if (!input.orderId) throw new Error("Заказ платежа не найден.");
    await transaction.order.update({
      where: { id: input.orderId },
      data: { status: "PAID" },
    });
    await transaction.auditLog.create({
      data: {
        action: "PAYMENT_CONFIRMED",
        entity: "Order",
        entityId: input.orderId,
        after: { invoiceId: input.invoiceId, amount: input.amount },
      },
    });
  }
  return true;
}
