import nodemailer from "nodemailer";
import { env } from "@/lib/config/env";
import { getAbsoluteSiteUrl } from "@/lib/config/site-url";

function transport() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) return null;
  return nodemailer.createTransport({
    host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
}

export async function sendMagicLinkEmail(email: string, token: string) {
  const mail = transport();
  if (!mail) return { sent: false, reason: "SMTP_NOT_CONFIGURED" };
  const url = getAbsoluteSiteUrl(`/my/auth/verify?token=${encodeURIComponent(token)}`);
  await mail.sendMail({
    from: env.SMTP_USER,
    to: email,
    subject: "Ваш заказ и доступ к курсу — Волчья Хватка",
    text: `Откройте единый личный кабинет по одноразовой ссылке (действует 15 минут):\n${url}`,
    html: `<p>Ваши заказы и курсы доступны в личном кабинете.</p><p><a href="${url}">Открыть личный кабинет</a></p><p>Ссылка действует 15 минут и используется один раз.</p>`,
  });
  return { sent: true };
}

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
  const mail = transport();
  if (!mail) return { sent: false, reason: "SMTP_NOT_CONFIGURED" };
  const from = env.SMTP_USER;
  const siteUrl = getAbsoluteSiteUrl("/");
  await mail.sendMail({
    from,
    to: order.email,
    subject: `Оплата заказа ${order.number} подтверждена`,
    text: `Спасибо! Заказ ${order.number} оплачен.\n\nСостав: ${order.products}\nСумма: ${order.amount} ₽\nДоставка: ${order.delivery}\n\nМы сообщим об отправке отдельно.\n\nСайт: ${siteUrl}`,
  });
  if (env.ORDER_NOTIFICATION_EMAIL) {
    await mail.sendMail({
      from,
      to: env.ORDER_NOTIFICATION_EMAIL,
      subject: `Оплачен новый заказ ${order.number}`,
      text: `Покупатель: ${order.customerName}\nТелефон: ${order.phone}\nEmail: ${order.email}\nТовары: ${order.products}\nСумма: ${order.amount} ₽\nДоставка: ${order.delivery}\nСайт: ${siteUrl}`,
    });
  }
  return { sent: true };
}
