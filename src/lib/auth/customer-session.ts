import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";

const COOKIE = "vh_customer_session";
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createCustomerSession(customerId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.customerSession.create({ data: { customerId, tokenHash: hashToken(token), expiresAt } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt,
  });
}

export async function getCustomer() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return db.customer.findFirst({
    where: {
      sessions: { some: { tokenHash: hashToken(token), expiresAt: { gt: new Date() }, revokedAt: null } },
    },
  });
}

export async function requireCustomer() {
  const customer = await getCustomer();
  if (!customer) redirect("/my/login");
  return customer;
}

export async function destroyCustomerSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    await db.customerSession.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  store.delete(COOKIE);
}
