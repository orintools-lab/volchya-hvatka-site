import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";

const COOKIE = "vh_admin_session";

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAdminSession(adminId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
  await db.session.create({ data: { adminId, tokenHash: tokenHash(token), expiresAt } });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getAdmin() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return db.adminUser.findFirst({
    where: {
      isActive: true,
      sessions: {
        some: { tokenHash: tokenHash(token), expiresAt: { gt: new Date() }, revokedAt: null },
      },
    },
  });
}

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function destroyAdminSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    await db.session.updateMany({
      where: { tokenHash: tokenHash(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  store.delete(COOKIE);
}
