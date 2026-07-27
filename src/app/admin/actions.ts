"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { createAdminSession, destroyAdminSession, requireAdmin } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { assertValidLengthRules } from "@/server/services/length-service";
import { createDeliveryPayment, createPaymentForAgreedOrder } from "@/server/services/order-service";
import {
  isCheckoutPaymentMode,
  type CheckoutPaymentMode,
} from "@/server/services/checkout-payment-mode";
import { createPaymentToken, decryptPaymentToken, publicPaymentUrl } from "@/server/services/payment-link";
import { sendOrderPaymentLinkEmail } from "@/lib/notifications/email";
import { sendDigitalDeliveryEmail } from "@/server/services/digital-delivery-service";
import {
  SELLER_SETTING_KEYS,
  sellerDetailsSchema,
} from "@/server/services/seller-details-policy";

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
  const deliveryMethod = String(formData.get("deliveryMethod") ?? "").trim();
  if (!Number.isFinite(deliveryPrice) || deliveryPrice < 0) throw new Error("Укажите корректную стоимость доставки.");
  if (!Number.isInteger(actualLengthCm) || actualLengthCm <= 0) throw new Error("Укажите фактическую длину шашек.");
  if (!deliveryMethod) throw new Error("Укажите способ доставки.");
  const order = await db.order.findUniqueOrThrow({ where: { id }, include: { payments: true } });
  const alreadyPaid = order.status === "PAID";
  const checkoutPaymentExists = order.payments.some((payment) =>
    !(typeof payment.payload === "object" &&
      payment.payload !== null &&
      !Array.isArray(payment.payload) &&
      (payment.payload as { purpose?: unknown }).purpose === "DELIVERY")
  );
  const total = checkoutPaymentExists ? order.total ?? order.subtotal : order.subtotal.add(deliveryPrice);
  await db.$transaction([
    db.order.update({
      where: { id },
      data: {
        deliveryPrice,
        agreedDeliveryPrice: deliveryPrice,
        deliveryComment,
        agreedDeliveryMethod: deliveryMethod,
        actualLengthCm,
        deliveryAgreementStatus: "AGREED",
        deliveryAgreedAt: new Date(),
        total,
        status: alreadyPaid ? "PAID" : "AWAITING_PAYMENT",
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
  let paymentUrl: string | null = null;
  if (alreadyPaid && deliveryPrice > 0) {
    paymentUrl = await createDeliveryPayment(id);
  } else if (!alreadyPaid) {
    paymentUrl = await createPaymentForAgreedOrder(id);
  }
  if (paymentUrl) {
    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: "PAYMENT_LINK_CREATED",
        entity: "Order",
        entityId: id,
        after: {
          deliveryPrice,
          paymentType: alreadyPaid ? "DELIVERY" : "ORDER",
        },
      },
    });
  }
  revalidatePath("/admin/orders");
  redirect(`/admin/orders/${id}?payment=ready`);
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

export async function recordPaymentLinkCopied(orderId: string, paymentId: string) {
  const admin = await requireAdmin();
  const payment = await db.payment.findFirst({ where: { id: paymentId, orderId } });
  if (!payment) throw new Error("Платёж не найден.");
  await db.auditLog.create({
    data: {
      adminId: admin.id,
      action: "PAYMENT_LINK_COPIED",
      entity: "Order",
      entityId: orderId,
      after: { paymentId },
    },
  });
}

export async function sendPaymentLinkByEmail(formData: FormData) {
  const admin = await requireAdmin();
  const orderId = String(formData.get("orderId"));
  const paymentId = String(formData.get("paymentId"));
  const payment = await db.payment.findFirst({
    where: { id: paymentId, orderId, status: "PENDING" },
    include: { order: true },
  });
  if (!payment?.order || !payment.paymentLinkTokenEncrypted) throw new Error("Активная ссылка не найдена.");
  const paymentUrl = publicPaymentUrl(decryptPaymentToken(payment.paymentLinkTokenEncrypted));
  const result = await sendOrderPaymentLinkEmail({
    email: payment.order.email,
    customerName: payment.order.customerName,
    orderNumber: payment.order.number,
    subtotal: payment.order.subtotal.toFixed(2),
    deliveryPrice: payment.order.deliveryPrice?.toFixed(2) ?? "0.00",
    total: payment.order.total?.toFixed(2) ?? payment.amount.toFixed(2),
    paymentUrl,
  });
  if (!result.sent) throw new Error("Отправка email пока не настроена");
  await db.auditLog.create({
    data: {
      adminId: admin.id,
      action: "PAYMENT_LINK_EMAIL_SENT",
      entity: "Order",
      entityId: orderId,
      after: { paymentId },
    },
  });
  redirect(`/admin/orders/${orderId}?email=sent`);
}

export async function resendDigitalDeliveryEmail(formData: FormData) {
  const admin = await requireAdmin();
  const deliveryId = String(formData.get("deliveryId"));
  const delivery = await db.digitalDelivery.findUnique({ where: { id: deliveryId } });
  if (!delivery) throw new Error("Выдача не найдена.");
  await db.digitalDelivery.update({
    where: { id: deliveryId },
    data: { emailSentAt: null, lastEmailError: null, status: delivery.status === "PENDING" ? "PENDING" : "READY" },
  });
  const result = await sendDigitalDeliveryEmail(deliveryId);
  await db.auditLog.create({
    data: {
      adminId: admin.id,
      action: result.sent ? "COURSE_EMAIL_RESENT" : "COURSE_EMAIL_FAILED",
      entity: "DigitalDelivery",
      entityId: deliveryId,
    },
  });
  revalidatePath("/admin/learning/deliveries");
}

export async function updateDigitalDelivery(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("deliveryId"));
  const operation = String(formData.get("operation"));
  const delivery = await db.digitalDelivery.findUniqueOrThrow({ where: { id }, include: { course: true } });
  if (operation === "revoke") {
    await db.digitalDelivery.update({ where: { id }, data: { status: "REVOKED" } });
  } else if (operation === "renew") {
    const token = createPaymentToken();
    const days = delivery.course.accessDurationDays;
    await db.digitalDelivery.update({
      where: { id },
      data: {
        tokenHash: token.hash,
        tokenEncrypted: token.encrypted,
        status: delivery.course.sourceUrl ? "READY" : "PENDING",
        expiresAt: days === null ? null : new Date(Date.now() + days * 86400000),
        emailSentAt: null,
        lastEmailError: null,
      },
    });
  } else if (operation === "extend") {
    const days = Number(formData.get("days"));
    if (![30, 90, 180, 365].includes(days)) throw new Error("Недопустимый срок доступа.");
    await db.digitalDelivery.update({
      where: { id },
      data: { expiresAt: new Date(Date.now() + days * 86400000), status: "READY" },
    });
  } else {
    throw new Error("Неизвестное действие.");
  }
  await db.auditLog.create({
    data: { adminId: admin.id, action: `DIGITAL_DELIVERY_${operation.toUpperCase()}`, entity: "DigitalDelivery", entityId: id },
  });
  revalidatePath("/admin/learning/deliveries");
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

export async function updateCheckoutSettings(formData: FormData) {
  const admin = await requireAdmin();
  const value = String(formData.get("checkoutPaymentMode") ?? "");
  if (!isCheckoutPaymentMode(value)) {
    throw new Error("Выберите допустимый порядок оплаты заказа.");
  }
  const mode: CheckoutPaymentMode = value;
  const expiryHours = Number(formData.get("paymentLinkExpiryHours"));
  if (!Number.isInteger(expiryHours) || expiryHours < 1 || expiryHours > 168) {
    throw new Error("Срок действия ссылки должен быть от 1 до 168 часов.");
  }
  const before = await db.siteSetting.findUnique({ where: { key: "checkoutPaymentMode" } });
  await db.$transaction([
    db.siteSetting.upsert({
      where: { key: "checkoutPaymentMode" },
      update: { value: mode },
      create: {
        key: "checkoutPaymentMode",
        label: "Порядок оплаты заказа",
        value: mode,
      },
    }),
    db.auditLog.create({
      data: {
        adminId: admin.id,
        action: "CHECKOUT_PAYMENT_MODE_UPDATED",
        entity: "SiteSetting",
        entityId: "checkoutPaymentMode",
        before: { value: before?.value ?? null },
        after: { value: mode },
      },
    }),
    db.siteSetting.upsert({
      where: { key: "paymentLinkExpiryHours" },
      update: { value: expiryHours },
      create: {
        key: "paymentLinkExpiryHours",
        label: "Срок действия ссылки на оплату",
        value: expiryHours,
      },
    }),
  ]);
  revalidatePath("/");
  revalidatePath("/admin/settings/payment");
  redirect("/admin/settings/payment?saved=1");
}

export async function updateSellerDetails(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = sellerDetailsSchema.safeParse(Object.fromEntries(
    SELLER_SETTING_KEYS.map((key) => [key, String(formData.get(key) ?? "")]),
  ));
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Проверьте реквизиты продавца.");
  }
  const labels: Record<(typeof SELLER_SETTING_KEYS)[number], string> = {
    sellerLegalName: "Полное наименование ИП",
    sellerInn: "ИНН продавца",
    sellerOgrnip: "ОГРНИП продавца",
    sellerAddress: "Адрес продавца",
    sellerEmail: "Email продавца",
    sellerPhone: "Телефон продавца",
  };
  await db.$transaction([
    ...SELLER_SETTING_KEYS.map((key) => db.siteSetting.upsert({
      where: { key },
      update: { value: parsed.data[key] },
      create: { key, label: labels[key], value: parsed.data[key] },
    })),
    db.auditLog.create({
      data: {
        adminId: admin.id,
        action: "SELLER_DETAILS_UPDATED",
        entity: "SiteSetting",
        entityId: "seller",
        after: { keys: [...SELLER_SETTING_KEYS] },
      },
    }),
  ]);
  revalidatePath("/", "layout");
  revalidatePath("/seller-details");
  revalidatePath("/admin/settings/seller");
  redirect("/admin/settings/seller?saved=1");
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

export async function saveCourse(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const data = {
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    coverImage: String(formData.get("coverImage") ?? "").trim() || null,
    regularPrice: Number(formData.get("regularPrice")),
    active: formData.get("active") === "on",
    deliveryMode: String(formData.get("deliveryMode") ?? "DOWNLOAD_LINK") as "DOWNLOAD_LINK" | "CUSTOMER_CABINET",
    sourceUrl: String(formData.get("sourceUrl") ?? "").trim() || null,
    accessDurationDays: String(formData.get("accessDurationDays") ?? "").trim()
      ? Number(formData.get("accessDurationDays"))
      : null,
    autoDeliveryEnabled: formData.get("autoDeliveryEnabled") === "on",
    emailTemplate: String(formData.get("emailTemplate") ?? "").trim() || null,
  };
  if (!data.slug || !data.title || !data.description || data.regularPrice <= 0) throw new Error("Проверьте курс.");
  if (id) await db.course.update({ where: { id }, data }); else await db.course.create({ data });
  revalidatePath("/admin/learning/courses");
}

export async function saveLesson(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const data = {
    courseId: String(formData.get("courseId")),
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    position: Number(formData.get("position")),
    videoProvider: String(formData.get("videoProvider")) as "YANDEX_DISK" | "YOUTUBE" | "VK_VIDEO" | "RUTUBE" | "MP4",
    videoUrl: String(formData.get("videoUrl") ?? "").trim() || null,
    durationSeconds: String(formData.get("durationSeconds") ?? "").trim() ? Number(formData.get("durationSeconds")) : null,
    active: formData.get("active") === "on",
  };
  if (!data.courseId || !data.title || !Number.isInteger(data.position)) throw new Error("Проверьте урок.");
  if (id) await db.courseLesson.update({ where: { id }, data }); else await db.courseLesson.create({ data });
  revalidatePath("/admin/learning/lessons");
}

export async function grantCourseAccess(formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const courseId = String(formData.get("courseId"));
  const customer = await db.customer.upsert({ where: { email }, update: {}, create: { email } });
  await db.courseAccess.upsert({
    where: { customerId_courseId: { customerId: customer.id, courseId } },
    update: { revokedAt: null },
    create: { customerId: customer.id, courseId },
  });
  revalidatePath("/admin/learning/accesses");
}

export async function revokeCourseAccess(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  await db.courseAccess.update({ where: { id }, data: { revokedAt: new Date() } });
  revalidatePath("/admin/learning/accesses");
}
