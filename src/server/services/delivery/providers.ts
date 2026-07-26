import { getIntegrationConfiguration } from "@/lib/config/env";
import { getDeliveryProvider } from "@/lib/delivery";
import { db } from "@/lib/db/client";

export type DeliveryAvailability = {
  provider: "CDEK" | "OZON" | "MANUAL";
  label: string;
  description: string;
  available: boolean;
  reason?: string;
};

export interface DeliveryService {
  readonly provider: DeliveryAvailability["provider"];
  checkAvailability(): Promise<{ available: boolean; reason?: string }>;
}

export class CdekDeliveryService implements DeliveryService {
  readonly provider = "CDEK" as const;

  async checkAvailability() {
    const configuration = getIntegrationConfiguration().cdek;
    if (!configuration.checkoutConfigured || !configuration.apiUrlMatchesMode) {
      return { available: false, reason: "Временно недоступно" };
    }
    try {
      await getDeliveryProvider().authenticate();
      return { available: true };
    } catch {
      return { available: false, reason: "Временно недоступно" };
    }
  }
}

export class OzonDeliveryService implements DeliveryService {
  readonly provider = "OZON" as const;

  async checkAvailability() {
    return { available: false, reason: "Интеграция не подключена" };
  }
}

export class ManualDeliveryService implements DeliveryService {
  readonly provider = "MANUAL" as const;

  async checkAvailability() {
    return { available: true };
  }
}

const services: Record<DeliveryAvailability["provider"], DeliveryService> = {
  CDEK: new CdekDeliveryService(),
  OZON: new OzonDeliveryService(),
  MANUAL: new ManualDeliveryService(),
};

export async function getDeliveryOptions({ includeUnavailable = false } = {}) {
  const configured = await db.deliveryProviderConfig.findMany({
    orderBy: { provider: "asc" },
  });
  if (!configured.some((item) => item.provider === "MANUAL")) {
    configured.push({
      provider: "MANUAL",
      isEnabled: true,
      label: "Доставка по согласованию",
      description: "После оформления заявки мы свяжемся с вами, уточним удобный способ доставки и её стоимость.",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  const options = await Promise.all(configured.map(async (configuration) => {
    const enabled = configuration.provider === "MANUAL" || configuration.isEnabled;
    const availability = enabled
      ? await services[configuration.provider].checkAvailability()
      : { available: false, reason: "Выключено администратором" };
    return {
      provider: configuration.provider,
      label: configuration.label,
      description: configuration.provider === "MANUAL"
        ? "После оформления заявки мы свяжемся с вами, уточним удобный способ доставки и её стоимость."
        : configuration.description,
      ...availability,
    };
  }));
  return includeUnavailable ? options : options.filter((option) => option.available);
}
