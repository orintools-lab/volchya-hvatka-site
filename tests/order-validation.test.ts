import { describe, expect, it } from "vitest";
import { orderSchema, quoteSchema } from "../src/lib/validation/order";

describe("order validation", () => {
  it("не принимает клиентскую цену товара и доставки как часть контракта", () => {
    const input = {
      productId: "product-1",
      deliveryProvider: "CDEK",
      quoteId: "quote-1",
      customerName: "Иван Иванов",
      phone: "+79990000000",
      email: "ivan@example.com",
      customerHeight: 175,
      privacyAccepted: true,
      offerAccepted: true,
      productPrice: 1,
      deliveryPrice: 1,
      total: 2,
    };
    const parsed = orderSchema.parse(input);
    expect(parsed).not.toHaveProperty("productPrice");
    expect(parsed).not.toHaveProperty("deliveryPrice");
    expect(parsed).not.toHaveProperty("total");
  });

  it("требует рост покупателя", () => {
    const result = orderSchema.safeParse({
      productId: "product-1",
      deliveryProvider: "MANUAL",
      customerName: "Иван Иванов",
      phone: "+79990000000",
      email: "ivan@example.com",
      privacyAccepted: true,
      offerAccepted: true,
    });
    expect(result.success).toBe(false);
  });

  it("позволяет ручную доставку без расчёта и quoteId", () => {
    expect(orderSchema.safeParse({
      productId: "product-1",
      deliveryProvider: "MANUAL",
      customerName: "Иван Иванов",
      phone: "+79990000000",
      email: "ivan@example.com",
      customerHeight: 175,
      privacyAccepted: true,
      offerAccepted: true,
    }).success).toBe(true);
  });

  it("не позволяет СДЭК без серверной котировки", () => {
    expect(orderSchema.safeParse({
      productId: "product-1",
      deliveryProvider: "CDEK",
      customerName: "Иван Иванов",
      phone: "+79990000000",
      email: "ivan@example.com",
      customerHeight: 175,
      privacyAccepted: true,
      offerAccepted: true,
    }).success).toBe(false);
  });

  it("не позволяет запросить расчёт без выбранного товара и города", () => {
    expect(quoteSchema.safeParse({
      productId: "",
      quantity: 1,
      cityCode: 0,
      cityName: "",
      deliveryType: "PICKUP",
    }).success).toBe(false);
  });
});
