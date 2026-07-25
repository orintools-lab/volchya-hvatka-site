"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { createAdminSession, destroyAdminSession, requireAdmin } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const admin = await db.adminUser.findUnique({ where: { email } });
  if (!admin || !admin.isActive || !(await verifyPassword(password, admin.passwordHash))) {
    redirect("/admin/login?error=1");
  }
  await createAdminSession(admin.id);
  redirect("/admin");
}

export async function logout() {
  await destroyAdminSession();
  redirect("/admin/login");
}

export async function updateOrder(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as
    | "AWAITING_PAYMENT" | "PAID" | "PROCESSING" | "READY_TO_SHIP"
    | "SHIPPED" | "COMPLETED" | "CANCELLED" | "REFUNDED";
  const adminNote = String(formData.get("adminNote") ?? "").trim();
  const before = await db.order.findUniqueOrThrow({ where: { id } });
  await db.$transaction([
    db.order.update({ where: { id }, data: { status, adminNote } }),
    db.auditLog.create({
      data: {
        adminId: admin.id, action: "ORDER_UPDATED", entity: "Order", entityId: id,
        before: { status: before.status, adminNote: before.adminNote },
        after: { status, adminNote },
      },
    }),
  ]);
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
}

export async function updateProduct(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  const price = String(formData.get("price"));
  const oldPrice = String(formData.get("oldPrice") ?? "").trim() || null;
  const before = await db.product.findUniqueOrThrow({ where: { id } });
  await db.$transaction([
    db.product.update({
      where: { id },
      data: {
        price,
        oldPrice,
        weightGrams: Number(formData.get("weightGrams")),
        lengthCm: Number(formData.get("lengthCm")),
        widthCm: Number(formData.get("widthCm")),
        heightCm: Number(formData.get("heightCm")),
        packageCount: Number(formData.get("packageCount")),
      },
    }),
    db.auditLog.create({
      data: {
        adminId: admin.id, action: "PRODUCT_UPDATED", entity: "Product", entityId: id,
        before: { price: before.price.toString(), oldPrice: before.oldPrice?.toString() },
        after: { price, oldPrice },
      },
    }),
  ]);
  revalidatePath("/");
  revalidatePath("/admin/products");
}

export async function updateContent(formData: FormData) {
  const admin = await requireAdmin();
  const entries = [
    ["hero.eyebrow", "Надзаголовок первого экрана"],
    ["hero.title", "Заголовок первого экрана"],
    ["hero.subtitle", "Подзаголовок первого экрана"],
    ["hero.primaryButtonText", "Текст основной кнопки"],
    ["hero.primaryButtonTarget", "Ссылка основной кнопки"],
    ["hero.secondaryButtonText", "Текст второй кнопки"],
    ["hero.secondaryButtonTarget", "Ссылка второй кнопки"],
    ["hero.imageUrl", "URL изображения"],
    ["hero.imageAlt", "Alt изображения"],
  ] as const;
  for (const [key, label] of entries) {
    const value = String(formData.get(key) ?? "").trim();
    if (!value) throw new Error(`${label} не может быть пустым.`);
    await db.contentBlock.upsert({
      where: { key },
      update: { value },
      create: { key, section: "hero", label, value },
    });
  }
  await db.contentBlock.upsert({
    where: { key: "hero.visible" },
    update: { value: formData.get("hero.visible") === "on" },
    create: {
      key: "hero.visible",
      section: "hero",
      label: "Показывать первый экран",
      value: formData.get("hero.visible") === "on",
    },
  });
  await db.auditLog.create({
    data: { adminId: admin.id, action: "CONTENT_UPDATED", entity: "ContentBlock", after: { keys: [...entries.map(([key]) => key), "hero.visible"] } },
  });
  revalidatePath("/");
  revalidatePath("/admin/content");
}

export async function saveReview(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const data = {
    authorName: String(formData.get("authorName") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim() || null,
    text: String(formData.get("text") ?? "").trim(),
    rating: Number(formData.get("rating")),
    isVisible: formData.get("isVisible") === "on",
    showOnHomepage: formData.get("showOnHomepage") === "on",
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };
  if (!data.authorName || !data.text || data.rating < 1 || data.rating > 5) throw new Error("Проверьте отзыв.");
  const review = id
    ? await db.review.update({ where: { id }, data })
    : await db.review.create({ data });
  await db.auditLog.create({ data: { adminId: admin.id, action: id ? "REVIEW_UPDATED" : "REVIEW_CREATED", entity: "Review", entityId: review.id } });
  revalidatePath("/");
  revalidatePath("/admin/reviews");
}

export async function saveFaq(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const data = {
    question: String(formData.get("question") ?? "").trim(),
    answer: String(formData.get("answer") ?? "").trim(),
    isVisible: formData.get("isVisible") === "on",
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };
  if (!data.question || !data.answer) throw new Error("Вопрос и ответ обязательны.");
  const faq = id
    ? await db.faqItem.update({ where: { id }, data })
    : await db.faqItem.create({ data });
  await db.auditLog.create({ data: { adminId: admin.id, action: id ? "FAQ_UPDATED" : "FAQ_CREATED", entity: "FaqItem", entityId: faq.id } });
  revalidatePath("/");
  revalidatePath("/admin/faq");
}
