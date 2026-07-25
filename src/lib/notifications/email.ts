import nodemailer from "nodemailer";
import { env } from "@/lib/config/env";

export interface PaidOrderNotification {
  number: string;
  customerName: string;
  phone: string;
  email: string;
  products: string;
  amount: string;
  delivery: string;
}

export async function sendPaidOrderNotifications(order: PaidOrderNotification) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    return { sent: false, reason: "SMTP_NOT_CONFIGURED" };
  }
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
  const from = env.SMTP_USER;
  await transport.sendMail({
    from,
    to: order.email,
    subject: `Оплата заказа ${order.number} подтверждена`,
    text: `Спасибо! Заказ ${order.number} оплачен.\n\nСостав: ${order.products}\nСумма: ${order.amount} ₽\nДоставка: ${order.delivery}\n\nМы сообщим об отправке отдельно.`,
  });
  if (env.ORDER_NOTIFICATION_EMAIL) {
    await transport.sendMail({
      from,
      to: env.ORDER_NOTIFICATION_EMAIL,
      subject: `Оплачен новый заказ ${order.number}`,
      text: `Покупатель: ${order.customerName}\nТелефон: ${order.phone}\nEmail: ${order.email}\nТовары: ${order.products}\nСумма: ${order.amount} ₽\nДоставка: ${order.delivery}`,
    });
  }
  return { sent: true };
}
