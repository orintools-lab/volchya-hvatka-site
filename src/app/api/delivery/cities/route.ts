import { NextResponse } from "next/server";
import { getDeliveryProvider } from "@/lib/delivery";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json([]);
  try {
    return NextResponse.json(await getDeliveryProvider().searchCities(query));
  } catch {
    return NextResponse.json(
      { error: "СДЭК временно недоступен. Выберите доставку по согласованию." },
      { status: 503 },
    );
  }
}
