import { describe, expect, it } from "vitest";
import { canOpenDigitalDelivery, digitalDeliveryExpiry } from "../src/server/services/digital-delivery-policy";

const valid = {
  orderStatus: "PAID",
  hasSucceededPayment: true,
  deliveryStatus: "READY",
  expiresAt: new Date("2027-01-01T00:00:00.000Z"),
  sourceUrl: "https://disk.yandex.ru/d/example",
};

describe("digital delivery access policy", () => {
  it("allows only a paid order with a succeeded payment", () => {
    expect(canOpenDigitalDelivery(valid, new Date("2026-01-01"))).toEqual({ allowed: true });
    expect(canOpenDigitalDelivery({ ...valid, orderStatus: "AWAITING_PAYMENT" }, new Date("2026-01-01")))
      .toEqual({ allowed: false, reason: "NOT_ACTIVE" });
    expect(canOpenDigitalDelivery({ ...valid, hasSucceededPayment: false }, new Date("2026-01-01")))
      .toEqual({ allowed: false, reason: "NOT_ACTIVE" });
  });

  it("rejects expired and revoked access", () => {
    expect(canOpenDigitalDelivery({ ...valid, expiresAt: new Date("2025-01-01") }, new Date("2026-01-01")))
      .toEqual({ allowed: false, reason: "EXPIRED" });
    expect(canOpenDigitalDelivery({ ...valid, deliveryStatus: "REVOKED" }, new Date("2026-01-01")))
      .toEqual({ allowed: false, reason: "REVOKED" });
  });

  it("supports permanent and configured access periods", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(digitalDeliveryExpiry(null, now)).toBeNull();
    expect(digitalDeliveryExpiry(365, now)?.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});
