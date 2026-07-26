import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { agreeManualDelivery, updateOrder } from "../../../actions";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.order.findUnique({ where: { id }, include: { items: true, payments: { include: { events: true } } } });
  if (!order) notFound();
  return <>
    <header className="admin-page-head"><div><p>Заказ</p><h1>{order.number}</h1></div><span className="status-badge">{order.status}</span></header>
    <div className="admin-detail-grid">
      <section className="admin-panel"><h2>Покупатель</h2><p>{order.customerName}</p><p>{order.phone}</p><p>{order.email}</p>
        <p>{order.city ?? "Город уточняется"}, {order.deliveryAddress ?? "адрес уточняется"}</p>
        <p>Рост: {order.customerHeight ?? "—"} см · длина: {order.actualLengthCm ?? "уточнить"} см</p>
        <p>Материал: {order.material} · {order.shashkaCount} шт.</p></section>
      <section className="admin-panel"><h2>Доставка</h2><p>{order.deliveryProvider} · {order.deliveryType ?? "по согласованию"}</p>
        <p>{order.deliveryProvider === "CDEK" ? `ПВЗ: ${order.cdekPointCode ?? "курьер"} ${order.cdekPointAddress ?? ""}` : `Статус согласования: ${order.deliveryAgreementStatus}`}</p>
        <p>{order.deliveryPrice?.toFixed(2) ?? "не согласована"} ₽{order.deliveryMinDays ? ` · ${order.deliveryMinDays}–${order.deliveryMaxDays} дн.` : ""}</p></section>
      <section className="admin-panel"><h2>Состав</h2>{order.items.map((item)=><p key={item.id}>{item.productName} × {item.quantity} — {item.total.toFixed(2)} ₽</p>)}
        <strong>Итого: {order.total?.toFixed(2) ?? "после согласования"} ₽</strong></section>
      <section className="admin-panel"><h2>Оплата</h2>{order.payments.length === 0 && <p>NOT_CREATED</p>}{order.payments.map((payment)=><p key={payment.id}>#{payment.invoiceId} · {payment.status} · {payment.amount.toFixed(2)} ₽</p>)}</section>
    </div>
    {order.deliveryProvider === "MANUAL" && order.deliveryAgreementStatus !== "AGREED" && <form action={agreeManualDelivery} className="admin-panel admin-form">
      <h2>Согласовать доставку</h2><input type="hidden" name="id" value={order.id} />
      <label>Фактическая длина каждой шашки, см<input name="actualLengthCm" type="number" min="1" defaultValue={order.actualLengthCm ?? order.recommendedLengthCm ?? ""} required /></label>
      <label>Стоимость доставки, ₽<input name="deliveryPrice" type="number" min="0" step="0.01" required /></label>
      <label>Комментарий по доставке<textarea name="deliveryComment" rows={3} required /></label>
      <button className="button">Согласовать и создать ссылку на оплату</button>
    </form>}
    {order.payments.find((payment) => payment.status === "PENDING")?.providerPaymentId && <section className="admin-panel">
      <h2>Ссылка на оплату</h2>
      <a className="button-secondary" href={order.payments.find((payment) => payment.status === "PENDING")?.providerPaymentId ?? "#"} target="_blank">Открыть ссылку</a>
    </section>}
    <form action={updateOrder} className="admin-panel admin-form"><h2>Обработка</h2><input type="hidden" name="id" value={order.id} />
      <label>Статус<select name="status" defaultValue={order.status}>{["AWAITING_DELIVERY_AGREEMENT","AWAITING_SIZE_AGREEMENT","AWAITING_PAYMENT","PAID","PROCESSING","READY_TO_SHIP","SHIPPED","COMPLETED","CANCELLED","REFUNDED"].map((item)=><option key={item}>{item}</option>)}</select></label>
      <label>Внутренняя заметка<textarea name="adminNote" defaultValue={order.adminNote ?? ""} rows={5} /></label>
      <button className="button">Сохранить</button></form>
  </>;
}
