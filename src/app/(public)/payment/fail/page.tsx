import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db/client";
import {
  decryptPaymentToken,
  isPaymentLinkExpired,
  publicPaymentUrl,
} from "@/server/services/payment-link";

export const metadata: Metadata = {
  title: "Оплата не завершена",
  alternates: { canonical: "/payment/fail" },
  robots: { index: false, follow: false },
  openGraph: { url: "/payment/fail" },
};

export const dynamic = "force-dynamic";

export default async function FailPage({
  searchParams,
}: {
  searchParams: Promise<{ InvId?: string }>;
}) {
  const invoiceId = Number((await searchParams).InvId);
  const payment = Number.isInteger(invoiceId)
    ? await db.payment.findUnique({ where: { invoiceId } })
    : null;
  const retryUrl = payment?.status === "PENDING" &&
    payment.paymentLinkTokenEncrypted &&
    !isPaymentLinkExpired(payment.paymentLinkExpiresAt)
    ? publicPaymentUrl(decryptPaymentToken(payment.paymentLinkTokenEncrypted))
    : "/#products";
  return <main className="section-light" style={{minHeight:"100vh"}}>
    <p className="eyebrow">Статус платежа</p>
    <h1>Оплата не завершена</h1>
    <p className="lead" style={{color:"#121212"}}>
      Деньги не списаны либо платёж был отклонён
    </p>
    <div className="actions">
      <Link className="button" href={retryUrl}>Попробовать оплатить снова</Link>
      <Link className="button-secondary" href="/">Вернуться на главную</Link>
    </div>
  </main>;
}
