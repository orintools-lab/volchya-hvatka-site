import { NextResponse } from "next/server";
import { consumeMagicLink } from "@/server/services/customer-auth-service";
import { getAbsoluteSiteUrl } from "@/lib/config/site-url";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const valid = token ? await consumeMagicLink(token) : false;
  return NextResponse.redirect(getAbsoluteSiteUrl(valid ? "/my" : "/my/login?error=expired"));
}
