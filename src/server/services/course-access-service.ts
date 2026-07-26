import { db } from "@/lib/db/client";

async function customerForOrder(orderId: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  const email = order.email.trim().toLowerCase();
  const customer = await db.customer.upsert({
    where: { email },
    update: { name: order.customerName, phone: order.phone },
    create: { email, name: order.customerName, phone: order.phone },
  });
  if (order.customerId !== customer.id) {
    await db.order.update({ where: { id: order.id }, data: { customerId: customer.id } });
  }
  return { customer, order };
}

export async function grantStartAccess(orderId: string) {
  const { customer, order } = await customerForOrder(orderId);
  if (!order.items.some((item) => item.productSlug === "start")) return null;
  const course = await db.course.findUnique({ where: { slug: "start" } });
  if (!course?.active) return null;
  return db.courseAccess.upsert({
    where: { customerId_courseId: { customerId: customer.id, courseId: course.id } },
    update: { revokedAt: null, orderId: order.id },
    create: { customerId: customer.id, courseId: course.id, orderId: order.id },
  });
}

export async function grantMasterAccessForUpsell(offerId: string) {
  const offer = await db.upsellOffer.findUnique({ where: { id: offerId } });
  if (!offer) return null;
  const { customer, order } = await customerForOrder(offer.orderId);
  const course = await db.course.findUnique({ where: { slug: "master" } });
  if (!course?.active) return null;
  return db.courseAccess.upsert({
    where: { customerId_courseId: { customerId: customer.id, courseId: course.id } },
    update: { revokedAt: null, orderId: order.id },
    create: { customerId: customer.id, courseId: course.id, orderId: order.id },
  });
}
