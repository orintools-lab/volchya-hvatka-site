import { db } from "@/lib/db/client";
import {
  parseCheckoutPaymentMode,
  type CheckoutPaymentMode,
} from "./checkout-payment-policy";

export * from "./checkout-payment-policy";

export async function getCheckoutPaymentMode(): Promise<CheckoutPaymentMode> {
  const setting = await db.siteSetting.findUnique({
    where: { key: "checkoutPaymentMode" },
    select: { value: true },
  });
  return parseCheckoutPaymentMode(setting?.value);
}

export async function getPaymentLinkExpiryHours() {
  const setting = await db.siteSetting.findUnique({
    where: { key: "paymentLinkExpiryHours" },
    select: { value: true },
  });
  const value = Number(setting?.value);
  return Number.isInteger(value) && value >= 1 && value <= 168 ? value : 72;
}
