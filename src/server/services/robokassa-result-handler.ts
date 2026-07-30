import { NextResponse } from "next/server";

type ResultProcessor = (input: {
  amount: string;
  invoiceId: number;
  signature: string;
  payload: Record<string, string>;
}) => Promise<string>;

async function readPayload(request: Request) {
  if (request.method === "POST") {
    const form = await request.formData();
    return Object.fromEntries(
      Array.from(form.entries()).map(([key, value]) => [key, String(value)]),
    );
  }
  return Object.fromEntries(new URL(request.url).searchParams.entries());
}

export async function handleRobokassaResult(
  request: Request,
  processResult: ResultProcessor,
) {
  const payload = await readPayload(request);
  const amount = payload.OutSum;
  const invoiceId = Number(payload.InvId);
  const signature = payload.SignatureValue;
  if (!amount || !Number.isInteger(invoiceId) || !signature) {
    return new NextResponse("bad request", { status: 400 });
  }
  try {
    const result = await processResult({ amount, invoiceId, signature, payload });
    console.info("robokassa_result_processed", { invoiceId, status: 200, result });
    return new NextResponse(result, { status: 200 });
  } catch (error) {
    const diagnostic = error as {
      code?: unknown;
      name?: unknown;
      message?: unknown;
      stack?: unknown;
    };
    console.error("robokassa_result_rejected", {
      invoiceId,
      errorCode: typeof diagnostic.code === "string" ? diagnostic.code : "UNKNOWN",
      errorName: typeof diagnostic.name === "string" ? diagnostic.name : "Error",
      message: typeof diagnostic.message === "string" ? diagnostic.message : "Unknown error",
      stack: typeof diagnostic.stack === "string" ? diagnostic.stack : undefined,
    });
    return new NextResponse("bad signature or payment", { status: 400 });
  }
}
