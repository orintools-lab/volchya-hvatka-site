import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q, status } = await searchParams;
  const orders = await db.order.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(q ? { OR: [
        { number: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
      ] } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { payments: true, items: true },
    take: 100,
  });
  return <>
    <header className="admin-page-head"><div><p>Продажи</p><h1>Заказы</h1></div>
      <a className="button-secondary" href="/api/admin/orders.csv">Экспорт CSV</a></header>
    <form className="admin-filters">
      <input name="q" defaultValue={q} placeholder="Номер, имя, телефон или email" />
      <select name="status" defaultValue={status}><option value="">Все статусы</option>
        {["NEW","AWAITING_DELIVERY_AGREEMENT","AWAITING_PAYMENT","PAID","PROCESSING","READY_TO_SHIP","SHIPPED","COMPLETED","CANCELLED","REFUNDED"].map((item)=><option key={item}>{item}</option>)}
      </select><button className="button">Найти</button>
    </form>
    <div className="admin-table">
      <div className="admin-row admin-table-head"><span>Заказ</span><span>Покупатель</span><span>Сумма</span><span>Оплата</span><span>Статус</span></div>
      {orders.map((order)=><a className="admin-row" href={`/admin/orders/${order.id}`} key={order.id}>
        <span><strong>{order.number}</strong><small>{order.createdAt.toLocaleString("ru-RU")}</small></span>
        <span>{order.customerName}<small>{order.phone}</small></span><span>{order.total?.toFixed(2) ?? "согласование"} ₽</span>
        <span>{order.payments.at(-1)?.status ?? "NOT_CREATED"}</span><span>{order.status}</span>
      </a>)}
    </div>
  </>;
}
