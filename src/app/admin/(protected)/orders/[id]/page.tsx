import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { updateOrder } from "../../../actions";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.order.findUnique({ where: { id }, include: { items: true, payments: { include: { events: true } } } });
  if (!order) notFound();
  return <>
    <header className="admin-page-head"><div><p>Заказ</p><h1>{order.number}</h1></div><span className="status-badge">{order.status}</span></header>
    <div className="admin-detail-grid">
      <section className="admin-panel"><h2>Покупатель</h2><p>{order.customerName}</p><p>{order.phone}</p><p>{order.email}</p>
        <p>{order.city}, {order.deliveryAddress}</p><p>Размер: {order.shashkaSize}{order.customerHeight ? `, рост ${order.customerHeight} см` : ""}</p></section>
      <section className="admin-panel"><h2>Доставка СДЭК</h2><p>{order.deliveryType} · {order.cdekTariffName}</p>
        <p>ПВЗ: {order.cdekPointCode ?? "курьер"} {order.cdekPointAddress}</p><p>{order.deliveryPrice.toFixed(2)} ₽ · {order.deliveryMinDays}–{order.deliveryMaxDays} дн.</p></section>
      <section className="admin-panel"><h2>Состав</h2>{order.items.map((item)=><p key={item.id}>{item.productName} × {item.quantity} — {item.total.toFixed(2)} ₽</p>)}
        <strong>Итого: {order.total.toFixed(2)} ₽</strong></section>
      <section className="admin-panel"><h2>Оплата</h2>{order.payments.map((payment)=><p key={payment.id}>#{payment.invoiceId} · {payment.status} · {payment.amount.toFixed(2)} ₽</p>)}</section>
    </div>
    <form action={updateOrder} className="admin-panel admin-form"><h2>Обработка</h2><input type="hidden" name="id" value={order.id} />
      <label>Статус<select name="status" defaultValue={order.status}>{["AWAITING_PAYMENT","PAID","PROCESSING","READY_TO_SHIP","SHIPPED","COMPLETED","CANCELLED","REFUNDED"].map((item)=><option key={item}>{item}</option>)}</select></label>
      <label>Внутренняя заметка<textarea name="adminNote" defaultValue={order.adminNote ?? ""} rows={5} /></label>
      <button className="button">Сохранить</button></form>
  </>;
}
