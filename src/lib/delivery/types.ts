export type DeliveryType = "PICKUP" | "COURIER";

export interface DeliveryPackage {
  weight: number;
  length: number;
  width: number;
  height: number;
}

export interface CityOption {
  code: number;
  city: string;
  region?: string;
  country?: string;
}

export interface PickupPoint {
  code: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface DeliveryCalculation {
  tariffCode: number;
  tariffName: string;
  deliverySum: number;
  periodMin?: number;
  periodMax?: number;
}

export interface DeliveryProvider {
  authenticate(): Promise<string>;
  searchCities(query: string): Promise<CityOption[]>;
  getPickupPoints(cityCode: number): Promise<PickupPoint[]>;
  calculateDelivery(input: {
    toCityCode: number;
    type: DeliveryType;
    packages: DeliveryPackage[];
  }): Promise<DeliveryCalculation[]>;
  validateDeliverySelection(input: {
    cityCode: number;
    type: DeliveryType;
    pointCode?: string;
    address?: string;
  }): Promise<{ point?: PickupPoint; address?: string }>;
  createShipment(input: unknown): Promise<{ uuid: string; cdekNumber?: string }>;
  getShipmentStatus(uuid: string): Promise<string>;
}
