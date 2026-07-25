import { NextResponse } from "next/server";
import { processRobokassaResult } from "@/server/services/order-service";

export const runtime = "nodejs";
export const maxDuration = 30;

async function readPayload(request: Request) {
  if (request.method === "POST") {
    const form = await request.formData();
    return Object.fromEntries(Array.from(form.entries()).map(([key, value]) => [key, String(value)]));
  }
  return Object.fromEntries(new URL(request.url).searchParams.entries());
}

async function handle(request: Request) {
  const payload = await readPayload(request);
  const amount = payload.OutSum;
  const invoiceId = Number(payload.InvId);
  const signature = payload.SignatureValue;
  if (!amount || !Number.isInteger(invoiceId) || !signature) {
    return new NextResponse("bad request", { status: 400 });
  }
  try {
    return new NextResponse(
      await processRobokassaResult({ amount, invoiceId, signature, payload }),
      { status: 200 },
    );
  } catch {
    return new NextResponse("bad signature or payment", { status: 400 });
  }
}

export const GET = handle;
export const POST = handle;
