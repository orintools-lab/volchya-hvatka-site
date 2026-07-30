export type PublicPaymentStatus = {
  paid: boolean;
  paymentStatus: string;
  orderStatus: string | null;
  orderNumber: string | null;
  continueUrl: string | null;
};

export function toPublicPaymentStatus(input: {
  invoiceId: number;
  paymentStatus?: string;
  orderStatus?: string | null;
  orderNumber?: string | null;
  upsellStatus?: string | null;
}): PublicPaymentStatus {
  const paid = input.paymentStatus === "SUCCEEDED" &&
    (input.orderStatus === "PAID" || input.upsellStatus === "ACCEPTED");
  return {
    paid,
    paymentStatus: input.paymentStatus ?? "NOT_FOUND",
    orderStatus: input.orderStatus ?? null,
    orderNumber: input.orderNumber ?? null,
    continueUrl: paid ? `/thank-you?InvId=${input.invoiceId}` : null,
  };
}

export function paymentReturnUrl(
  pathname: "/payment/success" | "/payment/fail",
  payload: Record<string, string>,
) {
  const params = new URLSearchParams();
  for (const key of ["InvId", "OutSum", "Culture"]) {
    if (payload[key]) params.set(key, payload[key]);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
