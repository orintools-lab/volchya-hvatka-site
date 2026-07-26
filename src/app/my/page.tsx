import Link from "next/link";
import { requireCustomer } from "@/lib/auth/customer-session";
import { db } from "@/lib/db/client";
import { customerLogout } from "./actions";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const customer = await requireCustomer();
  const [orders, accesses, activeOffer] = await Promise.all([
    db.order.findMany({ where: { customerId: customer.id }, include: { payments: true }, orderBy: { createdAt: "desc" } }),
    db.courseAccess.findMany({
      where: { customerId: customer.id, revokedAt: null, course: { active: true } },
      include: { course: { include: { lessons: { where: { active: true } } } } },
    }),
    db.upsellOffer.findFirst({
      where: { order: { customerId: customer.id }, status: "ACTIVE", expiresAt: { gt: new Date() } },
      include: { order: { include: { payments: { where: { status: "SUCCEEDED" }, take: 1 } } } },
    }),
  ]);
  return <main className="section-light" style={{minHeight:"100vh"}}>
    <header className="admin-page-head"><div><p>Личный кабинет</p><h1>Мои заказы и курсы</h1></div><form action={customerLogout}><button className="button-secondary">Выйти</button></form></header>
    <section><h2>Мои заказы</h2><div className="admin-list">{orders.map((order) =>
      <article className="admin-panel" key={order.id}><strong>{order.number}</strong><p>Оплата: {order.payments.at(-1)?.status ?? "NOT_CREATED"}</p><p>Доставка: {order.deliveryProvider} · {order.deliveryAgreementStatus}</p><p>Сумма: {order.total?.toFixed(2) ?? "согласовывается"} ₽</p></article>)}
      {orders.length === 0 && <p>Заказов пока нет.</p>}</div></section>
    <section><h2>Мои курсы</h2><div className="admin-detail-grid">{accesses.map(({ course }) =>
      <article className="admin-panel" key={course.id}>{course.coverImage && <div role="img" aria-label={`Обложка курса ${course.title}`} style={{backgroundImage:`url("${course.coverImage}")`,backgroundSize:"cover",backgroundPosition:"center",aspectRatio:"16/9"}} />}<h3>{course.title}</h3><p>{course.lessons.length} уроков</p><Link className="button" href={`/my/courses/${course.slug}`}>Перейти к занятиям</Link></article>)}
      {accesses.length === 0 && <p>Доступных курсов пока нет.</p>}</div></section>
    {activeOffer?.order.payments[0] && <section className="admin-panel"><h2>Активное специальное предложение</h2><Link className="button" href={`/thank-you?InvId=${activeOffer.order.payments[0].invoiceId}`}>Открыть предложение</Link></section>}
    <section className="admin-panel"><h2>Контактная информация</h2><p>{customer.name ?? "Имя не указано"}</p><p>{customer.email}</p><p>{customer.phone ?? "Телефон не указан"}</p></section>
  </main>;
}
