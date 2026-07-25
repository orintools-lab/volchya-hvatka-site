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
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "СДЭК недоступен." },
      { status: 503 },
    );
  }
}
