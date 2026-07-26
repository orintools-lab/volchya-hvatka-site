import { describe, expect, it } from "vitest";
import {
  isOfferActive,
  isUpsellEligible,
  offerExpiresAt,
  upsellPaymentData,
} from "../src/server/services/upsell-policy";

describe("post-purchase upsell", () => {
  const confirmedAt = new Date("2026-07-26T12:00:00.000Z");

  it("создаётся только для Старт без Мастера", () => {
    expect(isUpsellEligible([{ productSlug: "start" }])).toBe(true);
    expect(isUpsellEligible([{ productSlug: "start" }, { productSlug: "master" }])).toBe(false);
    expect(isUpsellEligible([{ productSlug: "master" }])).toBe(false);
  });

  it("истекает ровно через пять минут", () => {
    const expiresAt = offerExpiresAt(confirmedAt, 5);
    expect(expiresAt.toISOString()).toBe("2026-07-26T12:05:00.000Z");
    expect(isOfferActive({ status: "ACTIVE", expiresAt }, new Date("2026-07-26T12:04:59.999Z"))).toBe(true);
    expect(isOfferActive({ status: "ACTIVE", expiresAt }, expiresAt)).toBe(false);
  });

  it("после покупки предложение и таймер больше не активны", () => {
    expect(isOfferActive({
      status: "ACCEPTED",
      expiresAt: new Date("2026-07-26T13:00:00.000Z"),
    }, confirmedAt)).toBe(false);
  });

  it("повторная покупка невозможна для принятого предложения", () => {
    expect(isOfferActive({
      status: "ACCEPTED",
      expiresAt: new Date("2026-07-26T13:00:00.000Z"),
    }, confirmedAt)).toBe(false);
  });

  it("второй платёж связан с upsell, а не изменяет исходный заказ", () => {
    const data = upsellPaymentData({
      offerId: "offer-1",
      invoiceId: 987,
      amount: "2000.00",
      paymentUrl: "https://auth.robokassa.ru/example",
    });
    expect(data).toMatchObject({
      upsellOfferId: "offer-1",
      invoiceId: 987,
      amount: "2000.00",
      status: "PENDING",
    });
    expect(data).not.toHaveProperty("orderId");
  });
});
