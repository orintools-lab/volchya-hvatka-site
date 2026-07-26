"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { destroyCustomerSession, requireCustomer } from "@/lib/auth/customer-session";
import { requestMagicLink } from "@/server/services/customer-auth-service";
import { db } from "@/lib/db/client";

export async function sendLoginLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) redirect("/my/login?error=1");
  await requestMagicLink(email);
  redirect("/my/login?sent=1");
}

export async function customerLogout() {
  await destroyCustomerSession();
  redirect("/my/login");
}

export async function completeLesson(formData: FormData) {
  const customer = await requireCustomer();
  const lessonId = String(formData.get("lessonId") ?? "");
  const access = await db.courseAccess.findFirst({
    where: {
      customerId: customer.id,
      revokedAt: null,
      course: { active: true, lessons: { some: { id: lessonId, active: true } } },
    },
  });
  if (!access) throw new Error("Нет доступа к уроку.");
  await db.lessonProgress.upsert({
    where: { customerId_lessonId: { customerId: customer.id, lessonId } },
    update: { completedAt: new Date() },
    create: { customerId: customer.id, lessonId },
  });
  revalidatePath("/my");
}
