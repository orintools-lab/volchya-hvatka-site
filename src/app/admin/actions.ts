"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { createAdminSession, destroyAdminSession, requireAdmin } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { assertValidLengthRules } from "@/server/services/length-service";
import { createPaymentForAgreedOrder } from "@/server/services/order-service";

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
    | "AWAITING_DELIVERY_AGREEMENT" | "AWAITING_SIZE_AGREEMENT" | "AWAITING_PAYMENT" | "PAID" | "PROCESSING" | "READY_TO_SHIP"
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

export async function agreeManualDelivery(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  const deliveryPrice = Number(formData.get("deliveryPrice"));
  const actualLengthCm = Number(formData.get("actualLengthCm"));
  const deliveryComment = String(formData.get("deliveryComment") ?? "").trim();
  if (!Number.isFinite(deliveryPrice) || deliveryPrice < 0) throw new Error("Укажите корректную стоимость доставки.");
  if (!Number.isInteger(actualLengthCm) || actualLengthCm <= 0) throw new Error("Укажите фактическую длину шашек.");
  const order = await db.order.findUniqueOrThrow({ where: { id } });
  const total = order.subtotal.add(deliveryPrice);
  await db.$transaction([
    db.order.update({
      where: { id },
      data: {
        deliveryPrice,
        agreedDeliveryPrice: deliveryPrice,
        deliveryComment,
        actualLengthCm,
        deliveryAgreementStatus: "AGREED",
        deliveryAgreedAt: new Date(),
        total,
        status: "AWAITING_PAYMENT",
      },
    }),
    db.orderItem.updateMany({ where: { orderId: id }, data: { actualLengthCm } }),
    db.auditLog.create({
      data: {
        adminId: admin.id,
        action: "MANUAL_DELIVERY_AGREED",
        entity: "Order",
        entityId: id,
        after: { deliveryPrice, actualLengthCm, total: total.toString() },
      },
    }),
  ]);
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
}

export async function createManualPayment(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  await createPaymentForAgreedOrder(id);
  await db.auditLog.create({
    data: { adminId: admin.id, action: "MANUAL_PAYMENT_LINK_CREATED", entity: "Order", entityId: id },
  });
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

export async function updateDeliveryProviders(formData: FormData) {
  const admin = await requireAdmin();
  for (const provider of ["CDEK", "OZON", "MANUAL"] as const) {
    await db.deliveryProviderConfig.upsert({
      where: { provider },
      update: { isEnabled: provider === "MANUAL" || formData.get(provider) === "on" },
      create: {
        provider,
        label: provider === "CDEK" ? "СДЭК" : provider === "OZON" ? "Ozon" : "Доставка по согласованию",
        description: provider === "MANUAL"
          ? "Менеджер согласует способ и стоимость доставки после заявки."
          : "Автоматический расчёт доставки.",
        isEnabled: provider === "MANUAL" || formData.get(provider) === "on",
      },
    });
  }
  await db.auditLog.create({
    data: { adminId: admin.id, action: "DELIVERY_PROVIDERS_UPDATED", entity: "DeliveryProviderConfig" },
  });
  revalidatePath("/admin/settings/delivery");
}

export async function saveLengthRule(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const candidate = {
    id: id || undefined,
    minHeightCm: Number(formData.get("minHeightCm")),
    maxHeightCm: String(formData.get("maxHeightCm") ?? "").trim()
      ? Number(formData.get("maxHeightCm"))
      : null,
    lengthCm: Number(formData.get("lengthCm")),
    label: String(formData.get("label") ?? "").trim(),
    isActive: formData.get("isActive") === "on",
  };
  const existing = await db.lengthRule.findMany();
  assertValidLengthRules([
    ...existing.filter((rule) => rule.id !== id),
    candidate,
  ]);
  if (!candidate.label) throw new Error("Укажите название диапазона.");
  const rule = id
    ? await db.lengthRule.update({ where: { id }, data: candidate })
    : await db.lengthRule.create({ data: candidate });
  await db.auditLog.create({
    data: { adminId: admin.id, action: id ? "LENGTH_RULE_UPDATED" : "LENGTH_RULE_CREATED", entity: "LengthRule", entityId: rule.id },
  });
  revalidatePath("/admin/products/length-rules");
}

export async function updateUpsellSettings(formData: FormData) {
  const admin = await requireAdmin();
  const regularPrice = Number(formData.get("regularPrice"));
  const specialPrice = Number(formData.get("specialPrice"));
  const durationMinutes = Number(formData.get("durationMinutes"));
  const title = String(formData.get("title") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const videoUrl = String(formData.get("videoUrl") ?? "").trim() || null;
  if (
    !Number.isFinite(regularPrice) || regularPrice <= 0 ||
    !Number.isFinite(specialPrice) || specialPrice <= 0 ||
    !Number.isInteger(durationMinutes) || durationMinutes <= 0 ||
    !title || !text
  ) throw new Error("Проверьте настройки upsell.");
  await db.$transaction([
    db.upsellSettings.upsert({
      where: { id: "default" },
      update: {
        enabled: formData.get("enabled") === "on",
        regularPrice,
        specialPrice,
        durationMinutes,
        videoUrl,
        title,
        text,
      },
      create: {
        id: "default",
        enabled: formData.get("enabled") === "on",
        regularPrice,
        specialPrice,
        durationMinutes,
        videoUrl,
        title,
        text,
      },
    }),
    db.auditLog.create({
      data: { adminId: admin.id, action: "UPSELL_SETTINGS_UPDATED", entity: "UpsellSettings", entityId: "default" },
    }),
  ]);
  revalidatePath("/admin/marketing/upsell");
  revalidatePath("/thank-you");
}
