import { db } from "@/lib/db/client";
export default async function PaymentsPage() {
  const payments = await db.payment.findMany({ include:{order:true}, orderBy:{createdAt:"desc"}, take:100 });
  return <><header className="admin-page-head"><div><p>Финансы</p><h1>Платежи</h1></div></header>
    <div className="admin-table">{payments.map((payment)=><a className="admin-row" href={`/admin/orders/${payment.orderId}`} key={payment.id}>
      <span>#{payment.invoiceId}</span><span>{payment.order.number}</span><span>{payment.amount.toFixed(2)} ₽</span><span>{payment.status}</span><span>{payment.createdAt.toLocaleString("ru-RU")}</span>
    </a>)}</div></>;
}
