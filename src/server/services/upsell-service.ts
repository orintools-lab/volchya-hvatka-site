import { randomInt } from "node:crypto";
import { db } from "@/lib/db/client";
import { RobokassaPaymentProvider } from "@/lib/payments/robokassa";
import { isOfferActive, isUpsellEligible, offerExpiresAt, upsellPaymentData } from "./upsell-policy";

async function uniqueInvoiceId() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = randomInt(1000000, 2147483647);
    if (!(await db.payment.findUnique({ where: { invoiceId: candidate } }))) return candidate;
  }
  throw new Error("Не удалось сформировать номер счёта.");
}

export async function createUpsellAfterPayment(orderId: string, confirmedAt = new Date()) {
  const [settings, order] = await Promise.all([
    db.upsellSettings.findUnique({ where: { id: "default" } }),
    db.order.findUnique({ where: { id: orderId }, include: { items: true } }),
  ]);
  if (!settings?.enabled || !order || !isUpsellEligible(order.items)) return null;
  return db.upsellOffer.upsert({
    where: { orderId },
    update: {},
    create: {
      orderId,
      expiresAt: offerExpiresAt(confirmedAt, settings.durationMinutes),
      regularPrice: settings.regularPrice,
      specialPrice: settings.specialPrice,
    },
  });
}

export async function registerUpsellView(offerId: string, now = new Date()) {
  const offer = await db.upsellOffer.findUnique({ where: { id: offerId } });
  if (!offer) return null;
  if (!isOfferActive(offer, now)) {
    if (offer.status === "ACTIVE") {
      return db.upsellOffer.update({
        where: { id: offer.id },
        data: { status: "EXPIRED" },
      });
    }
    return offer;
  }
  return db.upsellOffer.update({
    where: { id: offer.id },
    data: { viewCount: { increment: 1 } },
  });
}

export async function createUpsellPayment(offerId: string, now = new Date()) {
  const offer = await db.upsellOffer.findUnique({
    where: { id: offerId },
    include: { order: true, payment: true },
  });
  if (!offer || !isOfferActive(offer, now) || offer.usedAt || offer.payment) {
    throw new Error("Предложение недоступно или уже использовано.");
  }
  const invoiceId = await uniqueInvoiceId();
  const paymentUrl = new RobokassaPaymentProvider().createPaymentUrl({
    invoiceId,
    amount: offer.specialPrice.toFixed(2),
    description: `Курс «Мастер» для заказа ${offer.order.number}`,
    email: offer.order.email,
  });
  await db.$transaction([
    db.payment.create({
      data: {
        ...upsellPaymentData({
          offerId: offer.id,
          invoiceId,
          amount: offer.specialPrice.toFixed(2),
          paymentUrl,
        }),
        type: "UPSELL",
      },
    }),
    db.upsellOffer.update({
      where: { id: offer.id },
      data: { clickCount: { increment: 1 } },
    }),
  ]);
  return paymentUrl;
}
