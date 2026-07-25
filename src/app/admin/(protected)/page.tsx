import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [newOrders, awaiting, paid, processing, latest] = await Promise.all([
    db.order.count({ where: { status: "NEW" } }),
    db.order.count({ where: { status: "AWAITING_PAYMENT" } }),
    db.order.count({ where: { status: "PAID" } }),
    db.order.count({ where: { status: { in: ["PROCESSING", "READY_TO_SHIP"] } } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { payments: true } }),
  ]);
  return <>
    <header className="admin-page-head"><div><p>Управление магазином</p><h1>Dashboard</h1></div></header>
    <section className="stat-grid">
      {[["Новые",newOrders],["Ждут оплату",awaiting],["Оплачены",paid],["В обработке",processing]].map(([label,value]) =>
        <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
    </section>
    <section className="admin-panel"><h2>Последние заказы</h2>
      <div className="admin-list">{latest.map((order) => <a href={`/admin/orders/${order.id}`} key={order.id}>
        <strong>{order.number}</strong><span>{order.customerName}</span><span>{order.total.toFixed(2)} ₽</span><span>{order.status}</span>
      </a>)}</div>
    </section>
  </>;
}
