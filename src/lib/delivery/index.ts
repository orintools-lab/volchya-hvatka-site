import { env } from "@/lib/config/env";
import { CdekDeliveryProvider } from "./cdek";
import type { DeliveryProvider } from "./types";

export function getDeliveryProvider(): DeliveryProvider {
  if (!env.DELIVERY_PROVIDERS.split(",").includes("cdek")) {
    throw new Error("Ни один production-провайдер доставки не включён.");
  }
  return new CdekDeliveryProvider();
}
