import { describe, expect, it } from "vitest";
import { orderSchema } from "../src/lib/validation/order";

const validOrder = {
  checkoutIdempotencyKey: "ddeb27fb-d9a0-4624-be4d-4615062daed4",
  productId: "product-1",
  deliveryProvider: "MANUAL" as const,
  customerName: "Иван Иванов",
  phone: "+79990000000",
  email: "ivan@example.com",
  customerHeight: 170,
  privacyAccepted: true as const,
  offerAccepted: true as const,
};

describe("checkout idempotency", () => {
  it("accepts a stable UUID for a checkout retry", () => {
    expect(orderSchema.parse(validOrder).checkoutIdempotencyKey)
      .toBe(validOrder.checkoutIdempotencyKey);
  });

  it("rejects a missing or malformed idempotency key", () => {
    expect(orderSchema.safeParse({
      ...validOrder,
      checkoutIdempotencyKey: "reused-human-readable-key",
    }).success).toBe(false);
    const withoutKey = { ...validOrder } as Partial<typeof validOrder>;
    delete withoutKey.checkoutIdempotencyKey;
    expect(orderSchema.safeParse(withoutKey).success).toBe(false);
  });
});
