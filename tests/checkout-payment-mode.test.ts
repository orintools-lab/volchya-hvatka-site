import { describe, expect, it } from "vitest";
import {
  checkoutPaymentPolicy,
  isCheckoutPaymentMode,
  parseCheckoutPaymentMode,
} from "../src/server/services/checkout-payment-policy";

describe("checkout payment mode", () => {
  it("keeps MANUAL unpaid until delivery agreement by default", () => {
    expect(checkoutPaymentPolicy({
      mode: "PAY_AFTER_DELIVERY_AGREEMENT",
      deliveryProvider: "MANUAL",
    })).toEqual({
      payImmediately: false,
      deliveryPrice: null,
      orderStatus: "AWAITING_DELIVERY_AGREEMENT",
      deliveryAgreementStatus: "PENDING",
    });
  });

  it("creates an immediate MANUAL payment without delivery charge", () => {
    expect(checkoutPaymentPolicy({
      mode: "PAY_IMMEDIATELY",
      deliveryProvider: "MANUAL",
    })).toEqual({
      payImmediately: true,
      deliveryPrice: 0,
      orderStatus: "AWAITING_PAYMENT",
      deliveryAgreementStatus: "PENDING",
    });
  });

  it("always pays a digital-only order immediately", () => {
    expect(checkoutPaymentPolicy({
      mode: "PAY_AFTER_DELIVERY_AGREEMENT",
      deliveryProvider: "MANUAL",
      digitalOnly: true,
    })).toMatchObject({
      payImmediately: true,
      orderStatus: "AWAITING_PAYMENT",
      deliveryAgreementStatus: "NOT_REQUIRED",
    });
  });

  it("accepts only supported values and falls back safely", () => {
    expect(isCheckoutPaymentMode("PAY_IMMEDIATELY")).toBe(true);
    expect(isCheckoutPaymentMode("client-forged-mode")).toBe(false);
    expect(parseCheckoutPaymentMode("client-forged-mode")).toBe("PAY_AFTER_DELIVERY_AGREEMENT");
  });
});
