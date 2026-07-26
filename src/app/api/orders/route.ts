import { NextResponse } from "next/server";
import { orderSchema } from "@/lib/validation/order";
import { createOrder } from "@/server/services/order-service";

export const runtime = "nodejs";
export const maxDuration = 30;

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
    const publicMessages = [
      "Этот способ доставки пока недоступен.",
      "Товар больше недоступен.",
      "Подтвердите способ доставки.",
      "Для указанного роста длина пока не настроена.",
      "Для роста менее 100 см доступно только индивидуальное согласование.",
      "Состав заказа изменился. Повторите расчёт.",
      "Расчёт доставки истёк. Выполните расчёт снова.",
      "Стоимость или тариф доставки изменились. Подтвердите новый расчёт.",
    ];
    const message = error instanceof Error && publicMessages.includes(error.message)
      ? error.message
      : "Не удалось создать заказ. Попробуйте ещё раз или выберите доставку по согласованию.";
    return NextResponse.json(
      { error: message },
      { status: 422 },
    );
  }
}
