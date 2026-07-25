import { NextResponse } from "next/server";
import { quoteSchema } from "@/lib/validation/order";
import { createDeliveryQuote } from "@/server/services/delivery-service";

export async function POST(request: Request) {
  const parsed = quoteSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Проверьте данные доставки." }, { status: 400 });
  }
  try {
    return NextResponse.json(await createDeliveryQuote(parsed.data));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось рассчитать доставку." },
      { status: 422 },
    );
  }
}
