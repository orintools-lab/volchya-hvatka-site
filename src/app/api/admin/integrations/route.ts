import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth/session";
import { getIntegrationConfiguration } from "@/lib/config/env";
import { getDeliveryProvider } from "@/lib/delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  if (!(await getAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configuration = getIntegrationConfiguration();
  let cdekConnection: "ok" | "failed" | "not_configured" = "not_configured";

  if (configuration.cdek.configured && configuration.cdek.apiUrlMatchesMode) {
    try {
      await getDeliveryProvider().authenticate();
      cdekConnection = "ok";
    } catch {
      cdekConnection = "failed";
    }
  }

  return NextResponse.json({
    cdek: {
      ...configuration.cdek,
      connection: cdekConnection,
    },
    robokassa: configuration.robokassa,
  });
}
