export const CHECKOUT_PAYMENT_MODES = [
  "PAY_AFTER_DELIVERY_AGREEMENT",
  "PAY_IMMEDIATELY",
] as const;

export type CheckoutPaymentMode = (typeof CHECKOUT_PAYMENT_MODES)[number];

export const DEFAULT_CHECKOUT_PAYMENT_MODE: CheckoutPaymentMode =
  "PAY_AFTER_DELIVERY_AGREEMENT";

export function isCheckoutPaymentMode(value: unknown): value is CheckoutPaymentMode {
  return typeof value === "string" &&
    CHECKOUT_PAYMENT_MODES.includes(value as CheckoutPaymentMode);
}

export function parseCheckoutPaymentMode(value: unknown): CheckoutPaymentMode {
  return isCheckoutPaymentMode(value) ? value : DEFAULT_CHECKOUT_PAYMENT_MODE;
}

export function checkoutPaymentPolicy(input: {
  mode: CheckoutPaymentMode;
  deliveryProvider: "CDEK" | "OZON" | "MANUAL";
  digitalOnly?: boolean;
}) {
  const payImmediately = input.digitalOnly === true ||
    input.mode === "PAY_IMMEDIATELY" ||
    input.deliveryProvider !== "MANUAL";

  return {
    payImmediately,
    deliveryPrice: input.deliveryProvider === "MANUAL" && payImmediately ? 0 : null,
    orderStatus: payImmediately
      ? ("AWAITING_PAYMENT" as const)
      : ("AWAITING_DELIVERY_AGREEMENT" as const),
    deliveryAgreementStatus: input.digitalOnly
      ? ("NOT_REQUIRED" as const)
      : input.deliveryProvider === "MANUAL"
        ? ("PENDING" as const)
        : ("NOT_REQUIRED" as const),
  };
}
