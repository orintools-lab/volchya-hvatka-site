import { NextResponse } from "next/server";
import { getDeliveryProvider } from "@/lib/delivery";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json([]);
  try {
    return NextResponse.json(await getDeliveryProvider().searchCities(query));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "СДЭК недоступен." },
      { status: 503 },
    );
  }
}
