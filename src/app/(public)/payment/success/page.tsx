import { db } from "@/lib/db/client";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Статус оплаты",
  alternates: { canonical: "/payment/success" },
  robots: { index: false, follow: false },
  openGraph: { url: "/payment/success" },
};

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ InvId?: string }> }) {
  const invoiceId = Number((await searchParams).InvId);
  const payment = Number.isInteger(invoiceId)
    ? await db.payment.findUnique({ where: { invoiceId }, include: { order: true, upsellOffer: true } })
    : null;
  const paid = payment?.status === "SUCCEEDED" &&
    (payment.order?.status === "PAID" || payment.upsellOffer?.status === "ACCEPTED");
  if (paid) redirect(`/thank-you?InvId=${invoiceId}`);
  return <main className="section-light" style={{minHeight:"100vh"}}>
    <p className="eyebrow">Заказ принят</p><h1>{paid ? "Оплата подтверждена" : "Проверяем оплату"}</h1>
    <p className="lead" style={{color:"#121212"}}>{paid
      ? `Спасибо. Заказ ${payment?.order?.number} оплачен и передан в обработку.`
      : "Возврат из платёжной формы не подтверждает оплату. Обновите страницу позже или свяжитесь с нами."}</p>
    <Link className="button" href="/">Вернуться на главную</Link>
  </main>;
}
