import { NextResponse } from "next/server";
import { orderSchema } from "@/lib/validation/order";
import { createOrder } from "@/server/services/order-service";

export async function POST(request: Request) {
  const parsed = orderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Проверьте обязательные поля.", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await createOrder(parsed.data), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось создать заказ." },
      { status: 422 },
    );
  }
}
