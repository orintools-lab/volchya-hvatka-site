import { z } from "zod";

export const quoteSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(10),
  cityCode: z.number().int().positive(),
  cityName: z.string().trim().min(2).max(160),
  deliveryType: z.enum(["PICKUP", "COURIER"]),
  pointCode: z.string().trim().min(1).optional(),
  address: z.string().trim().min(5).max(500).optional(),
});

export const orderSchema = z.object({
  productId: z.string().min(1),
  deliveryProvider: z.enum(["CDEK", "OZON", "MANUAL"]),
  quoteId: z.string().min(1).optional(),
  customerName: z.string().trim().min(3).max(200),
  phone: z.string().trim().min(7).max(32),
  email: z.string().email(),
  postalCode: z.string().trim().max(20).optional(),
  customerHeight: z.number().int().min(1).max(250),
  comment: z.string().trim().max(1000).optional(),
  privacyAccepted: z.literal(true),
  offerAccepted: z.literal(true),
  utm: z.record(z.string(), z.string().max(200)).optional(),
}).superRefine((value, context) => {
  if (value.deliveryProvider === "CDEK" && !value.quoteId) {
    context.addIssue({ code: "custom", path: ["quoteId"], message: "Подтвердите способ доставки." });
  }
});
