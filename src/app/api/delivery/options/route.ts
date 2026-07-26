import { NextResponse } from "next/server";
import { getDeliveryOptions } from "@/server/services/delivery/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const options = await getDeliveryOptions();
    return NextResponse.json(options);
  } catch {
    return NextResponse.json([
      {
        provider: "MANUAL",
        label: "Доставка по согласованию",
        description: "После оформления заказа мы свяжемся с вами, уточним удобный способ доставки и её стоимость.",
        available: true,
      },
    ]);
  }
}
