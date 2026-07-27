export function canOpenDigitalDelivery(input: {
  orderStatus: string;
  hasSucceededPayment: boolean;
  deliveryStatus: string;
  expiresAt: Date | null;
  sourceUrl: string | null;
}, now = new Date()) {
  if (input.deliveryStatus === "REVOKED") return { allowed: false as const, reason: "REVOKED" as const };
  if (input.expiresAt && input.expiresAt <= now) return { allowed: false as const, reason: "EXPIRED" as const };
  if (
    input.orderStatus !== "PAID" ||
    !input.hasSucceededPayment ||
    !input.sourceUrl ||
    !["READY", "SENT", "OPENED"].includes(input.deliveryStatus)
  ) return { allowed: false as const, reason: "NOT_ACTIVE" as const };
  return { allowed: true as const };
}

export function digitalDeliveryExpiry(days: number | null, now = new Date()) {
  return days === null ? null : new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
}
