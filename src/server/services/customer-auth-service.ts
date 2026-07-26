import { randomBytes } from "node:crypto";
import { db } from "@/lib/db/client";
import { hashToken, createCustomerSession } from "@/lib/auth/customer-session";
import { sendMagicLinkEmail } from "@/lib/notifications/email";

export async function requestMagicLink(emailInput: string) {
  const email = emailInput.trim().toLowerCase();
  const customer = await db.customer.upsert({ where: { email }, update: {}, create: { email } });
  await db.order.updateMany({ where: { email: { equals: email, mode: "insensitive" }, customerId: null }, data: { customerId: customer.id } });
  const token = randomBytes(32).toString("base64url");
  await db.magicLinkToken.create({
    data: { customerId: customer.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
  });
  await sendMagicLinkEmail(email, token);
}

export async function consumeMagicLink(token: string) {
  const tokenHash = hashToken(token);
  const record = await db.magicLinkToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt <= new Date()) return false;
  const claimed = await db.magicLinkToken.updateMany({
    where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return false;
  await createCustomerSession(record.customerId);
  return true;
}
