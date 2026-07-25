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
  quoteId: z.string().min(1),
  customerName: z.string().trim().min(3).max(200),
  phone: z.string().trim().min(7).max(32),
  email: z.string().email(),
  postalCode: z.string().trim().max(20).optional(),
  shashkaSize: z.enum(["ADULT", "TEEN", "CHILD", "BY_HEIGHT"]),
  customerHeight: z.number().int().min(80).max(230).optional(),
  comment: z.string().trim().max(1000).optional(),
  privacyAccepted: z.literal(true),
  offerAccepted: z.literal(true),
  utm: z.record(z.string(), z.string().max(200)).optional(),
}).superRefine((value, context) => {
  if (value.shashkaSize === "BY_HEIGHT" && !value.customerHeight) {
    context.addIssue({ code: "custom", path: ["customerHeight"], message: "Укажите рост." });
  }
});
