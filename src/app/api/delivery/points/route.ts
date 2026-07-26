import { NextResponse } from "next/server";
import { getDeliveryProvider } from "@/lib/delivery";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const cityCode = Number(new URL(request.url).searchParams.get("cityCode"));
  if (!Number.isInteger(cityCode) || cityCode <= 0) {
    return NextResponse.json({ error: "Некорректный город." }, { status: 400 });
  }
  try {
    return NextResponse.json(await getDeliveryProvider().getPickupPoints(cityCode));
  } catch {
    return NextResponse.json(
      { error: "СДЭК временно недоступен. Выберите доставку по согласованию." },
      { status: 503 },
    );
  }
}
