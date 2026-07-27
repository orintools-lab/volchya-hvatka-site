import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { createManualPayment, sendPaymentLinkByEmail, updateOrder } from "../../../actions";
import { AgreementPaymentForm } from "@/components/admin/agreement-payment-form";
import { PaymentLinkActions } from "@/components/admin/payment-link-actions";
import { decryptPaymentToken, publicPaymentUrl } from "@/server/services/payment-link";
import { isEmailConfigured } from "@/lib/notifications/email";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment?: string; email?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const order = await db.order.findUnique({ where: { id }, include: { items: true, payments: { include: { events: true } } } });
  if (!order) notFound();
  const audit = await db.auditLog.findMany({
    where: { entity: "Order", entityId: order.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const pendingPayment = order.payments
    .filter((payment) => payment.status === "PENDING" && payment.paymentLinkTokenEncrypted)
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0];
  const publicUrl = pendingPayment?.paymentLinkTokenEncrypted
    ? publicPaymentUrl(decryptPaymentToken(pendingPayment.paymentLinkTokenEncrypted))
    : null;
  return <>
    <header className="admin-page-head"><div><p>Заказ</p><h1>{order.number}</h1></div><span className="status-badge">{order.status}</span></header>
    <div className="admin-detail-grid">
      <section className="admin-panel"><h2>Покупатель</h2><p>{order.customerName}</p><p>{order.phone}</p><p>{order.email}</p>
        <p>{order.city ?? "Город уточняется"}, {order.deliveryAddress ?? "адрес уточняется"}</p>
        <p>Рост: {order.customerHeight ?? "—"} см</p>
        <p>Рекомендуемая длина: {order.recommendedLengthCm ?? "индивидуальный подбор"} см</p>
        <p>Фактическая длина: {order.actualLengthCm ?? "уточнить"} см</p>
        <p>Материал: {order.material} · {order.shashkaCount} шт.</p></section>
      <section className="admin-panel"><h2>Доставка</h2><p>{order.deliveryProvider} · {order.agreedDeliveryMethod ?? order.deliveryType ?? "по согласованию"}</p>
        <p>{order.deliveryProvider === "CDEK" ? `ПВЗ: ${order.cdekPointCode ?? "курьер"} ${order.cdekPointAddress ?? ""}` : `Статус согласования: ${order.deliveryAgreementStatus}`}</p>
        <p>{order.deliveryPrice?.toFixed(2) ?? "не согласована"} ₽{order.deliveryMinDays ? ` · ${order.deliveryMinDays}–${order.deliveryMaxDays} дн.` : ""}</p>
        <p>Комментарий покупателя: {order.customerComment || "—"}</p>
        <p>Комментарий по доставке: {order.deliveryComment || "—"}</p></section>
      <section className="admin-panel"><h2>Состав</h2>{order.items.map((item)=><p key={item.id}>{item.productName} × {item.quantity} — {item.total.toFixed(2)} ₽</p>)}
        <strong>Итого: {order.total?.toFixed(2) ?? "после согласования"} ₽</strong></section>
      <section className="admin-panel"><h2>Оплата</h2>{order.payments.length === 0 && <p>NOT_CREATED</p>}{order.payments.map((payment)=><p key={payment.id}>#{payment.invoiceId} · {payment.status} · {payment.amount.toFixed(2)} ₽</p>)}</section>
    </div>
    {query.payment === "ready" && <p className="admin-panel" role="status">Ссылка на оплату готова</p>}
    {query.email === "sent" && <p className="admin-panel" role="status">Ссылка отправлена покупателю</p>}
    {order.deliveryProvider === "MANUAL" && order.deliveryAgreementStatus !== "AGREED" &&
      <AgreementPaymentForm
        orderId={order.id}
        subtotal={order.subtotal.toFixed(2)}
        actualLengthCm={order.actualLengthCm ?? order.recommendedLengthCm}
        alreadyPaid={order.status === "PAID"}
      />}
    {order.deliveryProvider === "MANUAL" && order.deliveryAgreementStatus === "AGREED" && order.payments.length === 0 && <form action={createManualPayment} className="admin-panel admin-form">
      <h2>Оплата</h2><input type="hidden" name="id" value={order.id} />
      <p>Итоговая сумма сохранена: {order.total?.toFixed(2)} ₽. Ссылка на оплату ещё не создана.</p>
      <button className="button">Создать ссылку на оплату</button>
    </form>}
    {pendingPayment && publicUrl && <section className="admin-panel">
      <h2>Оплата заказа</h2>
      <PaymentLinkActions orderId={order.id} paymentId={pendingPayment.id} url={publicUrl} />
      <form action={sendPaymentLinkByEmail}>
        <input type="hidden" name="orderId" value={order.id} />
        <input type="hidden" name="paymentId" value={pendingPayment.id} />
        <button className="button-secondary" disabled={!isEmailConfigured()}>Отправить по email</button>
        {!isEmailConfigured() && <p>Отправка email пока не настроена</p>}
      </form>
    </section>}
    <section className="admin-panel">
      <h2>История действий</h2>
      {audit.length === 0 ? <p>Событий пока нет</p> : audit.map((event) =>
        <p key={event.id}><strong>{event.action}</strong> · {event.createdAt.toLocaleString("ru-RU")}</p>
      )}
    </section>
    <form action={updateOrder} className="admin-panel admin-form"><h2>Обработка</h2><input type="hidden" name="id" value={order.id} />
      <label>Статус<select name="status" defaultValue={order.status}>{["AWAITING_DELIVERY_AGREEMENT","AWAITING_SIZE_AGREEMENT","AWAITING_PAYMENT","PAID","PROCESSING","READY_TO_SHIP","SHIPPED","COMPLETED","CANCELLED","REFUNDED"].map((item)=><option key={item}>{item}</option>)}</select></label>
      <label>Внутренняя заметка<textarea name="adminNote" defaultValue={order.adminNote ?? ""} rows={5} /></label>
      <button className="button">Сохранить</button></form>
  </>;
}
