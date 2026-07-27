import { db } from "@/lib/db/client";
import {
  SELLER_SETTING_KEYS,
  type SellerDetails,
} from "./seller-details-policy";

export async function getSellerDetails(): Promise<Partial<SellerDetails>> {
  const settings = await db.siteSetting.findMany({
    where: { key: { in: [...SELLER_SETTING_KEYS] } },
    select: { key: true, value: true },
  });
  const details: Partial<SellerDetails> = {};
  for (const setting of settings) {
    if (
      typeof setting.value === "string" &&
      setting.value.trim() &&
      SELLER_SETTING_KEYS.includes(setting.key as (typeof SELLER_SETTING_KEYS)[number])
    ) {
      details[setting.key as keyof SellerDetails] = setting.value.trim();
    }
  }
  return details;
}

export function sellerDetailsComplete(details: Partial<SellerDetails>) {
  return SELLER_SETTING_KEYS.every((key) => Boolean(details[key]));
}
