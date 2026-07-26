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
