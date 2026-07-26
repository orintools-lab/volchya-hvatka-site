import { env, assertCdekConfigured } from "@/lib/config/env";
import type {
  CityOption,
  DeliveryCalculation,
  DeliveryProvider,
  PickupPoint,
} from "./types";

type TokenCache = { token: string; expiresAt: number } | undefined;
let tokenCache: TokenCache;

type CdekCity = { code: number; city: string; region?: string; country?: string };
type CdekPoint = {
  code: string;
  name: string;
  location: { address: string; latitude?: number; longitude?: number };
};
type CdekTariff = {
  tariff_code: number;
  tariff_name: string;
  delivery_mode?: number;
  delivery_sum: number;
  period_min?: number;
  period_max?: number;
};

export class CdekDeliveryProvider implements DeliveryProvider {
  async authenticate(): Promise<string> {
    assertCdekConfigured();
    if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.token;

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: env.CDEK_CLIENT_ID,
      client_secret: env.CDEK_CLIENT_SECRET,
    });
    const response = await fetch(`${env.CDEK_API_URL}/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Не удалось авторизоваться в СДЭК.");
    const data = (await response.json()) as { access_token: string; expires_in: number };
    tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return data.access_token;
  }

  private async request<T>(path: string, init?: RequestInit, canRetry = true): Promise<T> {
    const token = await this.authenticate();
    const response = await fetch(`${env.CDEK_API_URL}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        ...init?.headers,
      },
      cache: "no-store",
    });
    if (response.status === 401 && canRetry) {
      tokenCache = undefined;
      return this.request<T>(path, init, false);
    }
    if (!response.ok) throw new Error(`СДЭК временно недоступен (${response.status}).`);
    return (await response.json()) as T;
  }

  async searchCities(query: string): Promise<CityOption[]> {
    const cities = await this.request<CdekCity[]>(
      `/location/cities?country_codes=RU&city=${encodeURIComponent(query)}&size=20`,
    );
    return cities.map(({ code, city, region, country }) => ({ code, city, region, country }));
  }

  async getPickupPoints(cityCode: number): Promise<PickupPoint[]> {
    const points = await this.request<CdekPoint[]>(
      `/deliverypoints?city_code=${cityCode}&type=PVZ&is_handout=true`,
    );
    return points.map((point) => ({
      code: point.code,
      name: point.name,
      address: point.location.address,
      latitude: point.location.latitude,
      longitude: point.location.longitude,
    }));
  }

  async calculateDelivery(input: Parameters<DeliveryProvider["calculateDelivery"]>[0]) {
    const tariffs = await this.request<{ tariff_codes?: CdekTariff[] }>(
      "/calculator/tarifflist",
      {
        method: "POST",
        body: JSON.stringify({
          type: 1,
          from_location: { code: env.CDEK_SENDER_CITY_CODE },
          to_location: { code: input.toCityCode },
          packages: input.packages,
        }),
      },
    );
    const expectedMode = input.type === "PICKUP" ? 4 : 3;
    return (tariffs.tariff_codes ?? [])
      .filter((tariff) => tariff.delivery_mode === expectedMode)
      .map<DeliveryCalculation>((tariff) => ({
        tariffCode: tariff.tariff_code,
        tariffName: tariff.tariff_name,
        deliverySum: tariff.delivery_sum,
        periodMin: tariff.period_min,
        periodMax: tariff.period_max,
      }))
      .sort((a, b) => a.deliverySum - b.deliverySum);
  }

  async validateDeliverySelection(
    input: Parameters<DeliveryProvider["validateDeliverySelection"]>[0],
  ) {
    if (input.type === "PICKUP") {
      if (!input.pointCode) throw new Error("Выберите пункт выдачи СДЭК.");
      const point = (await this.getPickupPoints(input.cityCode)).find(
        (candidate) => candidate.code === input.pointCode,
      );
      if (!point) throw new Error("Выбранный пункт выдачи недоступен.");
      return { point };
    }
    const address = input.address?.trim();
    if (!address) throw new Error("Укажите адрес курьерской доставки.");
    return { address };
  }

  async createShipment(input: unknown) {
    const result = await this.request<{ entity: { uuid: string; cdek_number?: string } }>(
      "/orders",
      { method: "POST", body: JSON.stringify(input) },
    );
    return { uuid: result.entity.uuid, cdekNumber: result.entity.cdek_number };
  }

  async getShipmentStatus(uuid: string) {
    const result = await this.request<{ entity?: { statuses?: Array<{ code: string }> } }>(
      `/orders/${encodeURIComponent(uuid)}`,
    );
    return result.entity?.statuses?.at(-1)?.code ?? "UNKNOWN";
  }
}
