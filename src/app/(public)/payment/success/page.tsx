import { db } from "@/lib/db/client";
import type { Metadata } from "next";
import { PaymentStatus } from "@/components/public/payment-status";
import { toPublicPaymentStatus } from "@/lib/payments/public-status";

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
  const initial = toPublicPaymentStatus({
    invoiceId,
    paymentStatus: payment?.status,
    orderStatus: payment?.order?.status,
    orderNumber: payment?.order?.number,
    upsellStatus: payment?.upsellOffer?.status,
  });
  return <main className="section-light" style={{minHeight:"100vh"}}>
    <PaymentStatus
      invoiceId={Number.isInteger(invoiceId) ? invoiceId : null}
      initial={initial}
    />
  </main>;
}
