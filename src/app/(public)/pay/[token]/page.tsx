import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { hashPaymentToken, isPaymentLinkExpired } from "@/server/services/payment-link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Оплата заказа",
  robots: { index: false, follow: false },
};

export default async function PublicPaymentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payment = await db.payment.findUnique({
    where: { paymentLinkTokenHash: hashPaymentToken(token) },
    include: { order: true },
  });
  let message = "Ссылка недействительна";
  if (
    payment?.status === "SUCCEEDED" ||
    (payment?.type === "ORDER" && payment.order?.status === "PAID")
  ) {
    message = "Этот заказ уже оплачен";
  } else if (payment?.status === "PENDING" && isPaymentLinkExpired(payment.paymentLinkExpiresAt)) {
    await db.payment.update({ where: { id: payment.id }, data: { status: "EXPIRED" } });
    message = "Срок действия ссылки истёк. Свяжитесь с нами для получения новой ссылки.";
  } else if (payment?.status === "PENDING" && payment.order && payment.providerPaymentId) {
    redirect(payment.providerPaymentId);
  }
  return <main className="section-light" style={{ minHeight: "100vh" }}>
    <p className="eyebrow">Волчья Хватка</p>
    <h1>{message}</h1>
    <Link className="button" href="/">Вернуться на главную</Link>
  </main>;
}
