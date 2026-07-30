import { NextRequest, NextResponse } from "next/server";
import { paymentReturnUrl } from "@/lib/payments/public-status";

export async function middleware(request: NextRequest) {
  if (request.method !== "POST") return NextResponse.next();
  const pathname = request.nextUrl.pathname;
  if (pathname !== "/payment/success" && pathname !== "/payment/fail") {
    return NextResponse.next();
  }
  const form = await request.formData();
  const payload = Object.fromEntries(
    Array.from(form.entries()).map(([key, value]) => [key, String(value)]),
  );
  return NextResponse.redirect(
    new URL(
      paymentReturnUrl(pathname, payload),
      request.nextUrl.origin,
    ),
    303,
  );
}

export const config = {
  matcher: ["/payment/success", "/payment/fail"],
};
