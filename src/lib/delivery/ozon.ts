import type { DeliveryProvider } from "./types";

export class OzonDeliveryProvider implements DeliveryProvider {
  private unavailable(): never {
    throw new Error("Ozon Delivery отключён до получения договора и подтверждённой документации API.");
  }
  authenticate(): Promise<string> { return Promise.reject(this.unavailable()); }
  searchCities(): Promise<never> { return Promise.reject(this.unavailable()); }
  getPickupPoints(): Promise<never> { return Promise.reject(this.unavailable()); }
  calculateDelivery(): Promise<never> { return Promise.reject(this.unavailable()); }
  validateDeliverySelection(): Promise<never> { return Promise.reject(this.unavailable()); }
  createShipment(): Promise<never> { return Promise.reject(this.unavailable()); }
  getShipmentStatus(): Promise<never> { return Promise.reject(this.unavailable()); }
}
