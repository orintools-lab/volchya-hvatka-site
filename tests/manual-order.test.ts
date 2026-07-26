import { describe, expect, it } from "vitest";
import { manualOrderState } from "../src/server/services/manual-order";

describe("manual order", () => {
  it("остаётся заявкой без доставки и оплаты", () => {
    expect(manualOrderState({ customerHeight: 175 })).toEqual({
      status: "AWAITING_DELIVERY_AGREEMENT",
      deliveryProvider: "MANUAL",
      deliveryAgreementStatus: "PENDING",
      deliveryPrice: null,
      total: null,
      customerHeight: 175,
      recommendedLengthCm: undefined,
      actualLengthCm: undefined,
      shashkaCount: 2,
      material: "Берёзовая фанера",
    });
  });

  it("фиксирует рекомендованную длину для обеих шашек", () => {
    expect(manualOrderState({ customerHeight: 175, recommendedLengthCm: 85 }))
      .toMatchObject({ recommendedLengthCm: 85, actualLengthCm: 85, shashkaCount: 2 });
  });
});
