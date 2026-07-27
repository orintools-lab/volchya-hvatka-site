import { db } from "@/lib/db/client";
import { sendCourseDeliveryEmail } from "@/lib/notifications/email";
import {
  createPaymentToken,
  decryptPaymentToken,
  hashPaymentToken,
} from "./payment-link";
import { getAbsoluteSiteUrl } from "@/lib/config/site-url";
import { canOpenDigitalDelivery, digitalDeliveryExpiry } from "./digital-delivery-policy";

export function courseDownloadUrl(token: string) {
  return getAbsoluteSiteUrl(`/download/course/${encodeURIComponent(token)}`);
}

export async function provisionDigitalDelivery(input: {
  orderId: string;
  courseSlug: "start" | "master";
}) {
  const [order, course] = await Promise.all([
    db.order.findUnique({
      where: { id: input.orderId },
      include: { payments: { where: { status: "SUCCEEDED" } } },
    }),
    db.course.findUnique({ where: { slug: input.courseSlug } }),
  ]);
  if (!order || order.status !== "PAID" || order.payments.length === 0 || !course?.active) return null;

  const existing = await db.digitalDelivery.findUnique({
    where: { orderId_courseId: { orderId: order.id, courseId: course.id } },
  });
  if (existing) return existing;

  const token = createPaymentToken();
  const ready = course.deliveryMode === "DOWNLOAD_LINK" &&
    course.autoDeliveryEnabled &&
    Boolean(course.sourceUrl);
  return db.digitalDelivery.create({
    data: {
      orderId: order.id,
      courseId: course.id,
      customerEmail: order.email.trim().toLowerCase(),
      tokenHash: token.hash,
      tokenEncrypted: token.encrypted,
      status: ready ? "READY" : "PENDING",
      expiresAt: digitalDeliveryExpiry(course.accessDurationDays),
    },
  });
}

export async function sendDigitalDeliveryEmail(deliveryId: string) {
  const delivery = await db.digitalDelivery.findUnique({
    where: { id: deliveryId },
    include: { order: true, course: true },
  });
  if (!delivery || !["READY", "SENT", "OPENED"].includes(delivery.status)) {
    throw new Error("Доступ к курсу ещё не активирован");
  }
  if (delivery.emailSentAt) return { sent: true, alreadySent: true };
  const token = decryptPaymentToken(delivery.tokenEncrypted);
  try {
    const result = await sendCourseDeliveryEmail({
      email: delivery.customerEmail,
      customerName: delivery.order.customerName,
      orderNumber: delivery.order.number,
      courseTitle: delivery.course.title,
      accessUrl: courseDownloadUrl(token),
      expiresLabel: delivery.expiresAt
        ? delivery.expiresAt.toLocaleDateString("ru-RU")
        : "бессрочно",
    });
    if (!result.sent) {
      await db.digitalDelivery.update({
        where: { id: delivery.id },
        data: { lastEmailError: result.reason },
      });
      return result;
    }
    await db.digitalDelivery.update({
      where: { id: delivery.id },
      data: { emailSentAt: new Date(), lastEmailError: null, status: "SENT" },
    });
    return result;
  } catch (error) {
    await db.digitalDelivery.update({
      where: { id: delivery.id },
      data: { lastEmailError: error instanceof Error ? error.message : "Unknown email error" },
    });
    throw error;
  }
}

export async function deliverCourseAfterPayment(input: {
  orderId: string;
  courseSlug: "start" | "master";
}) {
  const delivery = await provisionDigitalDelivery(input);
  if (!delivery) return null;
  if (!delivery.emailSentAt && ["READY", "SENT", "OPENED"].includes(delivery.status)) {
    try {
      await sendDigitalDeliveryEmail(delivery.id);
    } catch {}
  }
  return delivery;
}

export async function resolveDigitalDelivery(token: string) {
  const delivery = await db.digitalDelivery.findUnique({
    where: { tokenHash: hashPaymentToken(token) },
    include: {
      order: { include: { payments: { where: { status: "SUCCEEDED" } } } },
      course: true,
    },
  });
  if (!delivery) return { ok: false as const, reason: "INVALID" as const };
  const policy = canOpenDigitalDelivery({
    orderStatus: delivery.order.status,
    hasSucceededPayment: delivery.order.payments.length > 0,
    deliveryStatus: delivery.status,
    expiresAt: delivery.expiresAt,
    sourceUrl: delivery.course.sourceUrl,
  });
  if (!policy.allowed && policy.reason === "EXPIRED") {
    await db.digitalDelivery.update({ where: { id: delivery.id }, data: { status: "EXPIRED" } });
  }
  if (!policy.allowed) {
    return { ok: false as const, reason: policy.reason };
  }
  const now = new Date();
  await db.digitalDelivery.update({
    where: { id: delivery.id },
    data: {
      status: "OPENED",
      firstOpenedAt: delivery.firstOpenedAt ?? now,
      lastOpenedAt: now,
      openCount: { increment: 1 },
    },
  });
  return { ok: true as const, sourceUrl: delivery.course.sourceUrl! };
}

export async function getDigitalDeliveryPublicUrl(delivery: {
  tokenEncrypted: string;
}) {
  return courseDownloadUrl(decryptPaymentToken(delivery.tokenEncrypted));
}
