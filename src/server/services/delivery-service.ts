import { db } from "@/lib/db/client";
import { getDeliveryProvider } from "@/lib/delivery";
import type { DeliveryType } from "@/lib/delivery/types";

function packagesForProduct(
  product: {
    weightGrams: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    packageCount: number;
  },
  quantity: number,
) {
  return Array.from({ length: product.packageCount }, () => ({
    weight: Math.ceil((product.weightGrams * quantity) / product.packageCount),
    length: product.lengthCm,
    width: product.widthCm,
    height: product.heightCm,
  }));
}

export async function createDeliveryQuote(input: {
  productId: string;
  quantity: number;
  cityCode: number;
  cityName: string;
  deliveryType: DeliveryType;
  pointCode?: string;
  address?: string;
}) {
  const product = await db.product.findFirst({
    where: { id: input.productId, isActive: true },
  });
  if (!product) throw new Error("Выбранный товар больше недоступен.");

  const provider = getDeliveryProvider();
  const selection = await provider.validateDeliverySelection({
    cityCode: input.cityCode,
    type: input.deliveryType,
    pointCode: input.pointCode,
    address: input.address,
  });
  const tariffs = await provider.calculateDelivery({
    toCityCode: input.cityCode,
    type: input.deliveryType,
    packages: packagesForProduct(product, input.quantity),
  });
  const preferred = tariffs.find(
    (tariff) => tariff.tariffCode === Number(process.env.CDEK_DEFAULT_TARIFF_CODE),
  );
  const tariff = preferred ?? tariffs[0];
  if (!tariff) throw new Error("СДЭК не вернул доступный тариф для выбранной доставки.");

  const quote = await db.deliveryQuote.create({
    data: {
      productId: product.id,
      quantity: input.quantity,
      cityCode: input.cityCode,
      cityName: input.cityName,
      deliveryType: input.deliveryType,
      pointCode: selection.point?.code,
      pointName: selection.point?.name,
      pointAddress: selection.point?.address,
      address: selection.address,
      tariffCode: tariff.tariffCode,
      tariffName: tariff.tariffName,
      price: tariff.deliverySum,
      minDays: tariff.periodMin,
      maxDays: tariff.periodMax,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  return {
    id: quote.id,
    price: quote.price.toFixed(2),
    tariffName: quote.tariffName,
    periodMin: quote.minDays,
    periodMax: quote.maxDays,
    point: selection.point,
    address: selection.address,
  };
}

export async function revalidateDeliveryQuote(quoteId: string) {
  const quote = await db.deliveryQuote.findUnique({ where: { id: quoteId } });
  if (!quote || quote.expiresAt <= new Date()) {
    throw new Error("Расчёт доставки истёк. Выполните расчёт снова.");
  }
  const refreshed = await createDeliveryQuote({
    productId: quote.productId,
    quantity: quote.quantity,
    cityCode: quote.cityCode,
    cityName: quote.cityName,
    deliveryType: quote.deliveryType,
    pointCode: quote.pointCode ?? undefined,
    address: quote.address ?? undefined,
  });
  const current = await db.deliveryQuote.findUniqueOrThrow({ where: { id: refreshed.id } });
  if (!current.price.equals(quote.price) || current.tariffCode !== quote.tariffCode) {
    throw new Error("Стоимость или тариф доставки изменились. Подтвердите новый расчёт.");
  }
  return quote;
}
