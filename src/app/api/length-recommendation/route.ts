import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { findLengthRecommendation } from "@/server/services/length-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const heightCm = Number(new URL(request.url).searchParams.get("height"));
  if (!Number.isInteger(heightCm) || heightCm < 1 || heightCm > 250) {
    return NextResponse.json({ error: "Укажите корректный рост." }, { status: 400 });
  }
  if (heightCm < 100) {
    return NextResponse.json({ configured: false, individual: true });
  }
  const rules = await db.lengthRule.findMany({
    where: { isActive: true },
    orderBy: [{ minHeightCm: "asc" }, { sortOrder: "asc" }],
  });
  const rule = findLengthRecommendation(rules, heightCm);
  return NextResponse.json(rule
    ? { configured: true, lengthCm: rule.lengthCm, label: rule.label }
    : { configured: false });
}
