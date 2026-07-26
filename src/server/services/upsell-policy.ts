export type UpsellItem = { productSlug: string };

export function isUpsellEligible(items: UpsellItem[]) {
  return items.some((item) => item.productSlug === "start") &&
    !items.some((item) => item.productSlug === "master");
}

export function isOfferActive(
  offer: { status: "ACTIVE" | "ACCEPTED" | "EXPIRED"; expiresAt: Date },
  now = new Date(),
) {
  return offer.status === "ACTIVE" && offer.expiresAt.getTime() > now.getTime();
}

export function offerExpiresAt(confirmedAt: Date, durationMinutes: number) {
  return new Date(confirmedAt.getTime() + durationMinutes * 60_000);
}

export function upsellPaymentData(input: {
  offerId: string;
  invoiceId: number;
  amount: string;
  paymentUrl: string;
}) {
  return {
    upsellOfferId: input.offerId,
    provider: "robokassa",
    invoiceId: input.invoiceId,
    idempotencyKey: `robokassa:upsell:${input.offerId}`,
    status: "PENDING" as const,
    amount: input.amount,
    providerPaymentId: input.paymentUrl,
  };
}
