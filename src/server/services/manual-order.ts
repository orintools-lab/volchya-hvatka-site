export const SHASHKA_MATERIAL = "Берёзовая фанера";

export function manualOrderState(input: {
  customerHeight: number;
  recommendedLengthCm?: number;
}) {
  return {
    status: (input.customerHeight < 100
      ? "AWAITING_SIZE_AGREEMENT"
      : "AWAITING_DELIVERY_AGREEMENT") as
        "AWAITING_SIZE_AGREEMENT" | "AWAITING_DELIVERY_AGREEMENT",
    deliveryProvider: "MANUAL" as const,
    deliveryAgreementStatus: "PENDING" as const,
    deliveryPrice: null,
    total: null,
    customerHeight: input.customerHeight,
    recommendedLengthCm: input.recommendedLengthCm,
    actualLengthCm: input.recommendedLengthCm,
    shashkaCount: 2,
    material: SHASHKA_MATERIAL,
  };
}
