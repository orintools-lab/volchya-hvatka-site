"use server";

import { redirect } from "next/navigation";
import { createUpsellPayment } from "@/server/services/upsell-service";

export async function acceptUpsell(formData: FormData) {
  const offerId = String(formData.get("offerId") ?? "");
  if (!offerId) throw new Error("Предложение не найдено.");
  redirect(await createUpsellPayment(offerId));
}
