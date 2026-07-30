import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { toPublicPaymentStatus } from "@/lib/payments/public-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const invoiceId = Number(new URL(request.url).searchParams.get("InvId"));
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    return NextResponse.json({ error: "Invalid invoice" }, { status: 400 });
  }
  const payment = await db.payment.findUnique({
    where: { invoiceId },
    include: { order: true, upsellOffer: true },
  });
  const status = toPublicPaymentStatus({
    invoiceId,
    paymentStatus: payment?.status,
    orderStatus: payment?.order?.status,
    orderNumber: payment?.order?.number,
    upsellStatus: payment?.upsellOffer?.status,
  });
  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
