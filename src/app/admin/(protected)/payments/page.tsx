import Link from "next/link";
import { db } from "@/lib/db/client";
import { PaymentLinkActions } from "@/components/admin/payment-link-actions";
import { decryptPaymentToken, publicPaymentUrl } from "@/server/services/payment-link";
import { createManualPayment } from "../../actions";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const payments = await db.payment.findMany({
    include: { order: true, upsellOffer: { include: { order: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return <>
    <header className="admin-page-head"><div><p>Финансы</p><h1>Платежи</h1></div></header>
    {payments.length === 0 ? <section className="admin-panel"><p>Платежей пока нет</p></section> : (
      <div className="admin-table">
        <div className="admin-row admin-table-head">
          <span>Дата</span><span>Заказ / покупатель</span><span>Тип</span><span>Сумма / статус</span><span>Действия</span>
        </div>
        {payments.map((payment) => {
          const order = payment.order ?? payment.upsellOffer?.order;
          const url = payment.paymentLinkTokenEncrypted
            ? publicPaymentUrl(decryptPaymentToken(payment.paymentLinkTokenEncrypted))
            : null;
          return <div className="admin-row" key={payment.id}>
            <span>{payment.createdAt.toLocaleString("ru-RU")}<small>InvId {payment.invoiceId}</small></span>
            <span>{order?.number ?? "—"}<small>{order ? `${order.customerName} · ${order.email}` : "Без заказа"}</small></span>
            <span>{payment.type}</span>
            <span>{payment.amount.toFixed(2)} ₽<small>{payment.status}{payment.paidAt ? ` · ${payment.paidAt.toLocaleString("ru-RU")}` : ""}</small></span>
            <span>
              {order && <Link href={`/admin/orders/${order.id}`}>Открыть заказ</Link>}
              {url && order && <PaymentLinkActions orderId={order.id} paymentId={payment.id} url={url} />}
              {payment.status === "EXPIRED" && order && order.status !== "PAID" && <form action={createManualPayment}>
                <input type="hidden" name="id" value={order.id} />
                <button className="button-secondary">Создать новую ссылку</button>
              </form>}
            </span>
          </div>;
        })}
      </div>
    )}
  </>;
}
