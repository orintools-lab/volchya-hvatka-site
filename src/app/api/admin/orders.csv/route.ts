import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db/client";

function csv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET() {
  await requireAdmin();
  const orders = await db.order.findMany({ include: { items: true, payments: true }, orderBy: { createdAt: "desc" } });
  const rows = [
    ["Номер","Дата","Покупатель","Телефон","Email","Товары","Сумма","Доставка","ПВЗ/адрес","Оплата","Статус"],
    ...orders.map((order)=>[
      order.number,order.createdAt.toISOString(),order.customerName,order.phone,order.email,
      order.items.map((item)=>`${item.productName} × ${item.quantity}`).join("; "),
      order.total?.toFixed(2) ?? "",order.deliveryProvider,order.cdekPointAddress ?? order.deliveryAddress,
      order.payments.at(-1)?.status ?? "NOT_CREATED",order.status,
    ]),
  ];
  const body = "\uFEFF" + rows.map((row)=>row.map(csv).join(";")).join("\r\n");
  return new Response(body,{headers:{"content-type":"text/csv; charset=utf-8","content-disposition":"attachment; filename=orders.csv"}});
}
