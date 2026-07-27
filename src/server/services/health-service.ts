import { db } from "@/lib/db/client";
import { env, getIntegrationConfiguration } from "@/lib/config/env";
import { getAbsoluteSiteUrl } from "@/lib/config/site-url";
import { isEmailConfigured, verifySmtpConnection } from "@/lib/notifications/email";

export type HealthCheck = {
  name: string;
  ok: boolean;
  detail: string;
};

async function canFetch(path: string) {
  try {
    const response = await fetch(getAbsoluteSiteUrl(path), {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getSystemHealth(): Promise<HealthCheck[]> {
  const configuration = getIntegrationConfiguration();
  const [database, smtp, site, sitemap, robots] = await Promise.all([
    db.$queryRaw`SELECT 1`
      .then(() => true)
      .catch(() => false),
    verifySmtpConnection(),
    canFetch("/"),
    canFetch("/sitemap.xml"),
    canFetch("/robots.txt"),
  ]);
  const ssl = env.NEXT_PUBLIC_SITE_URL.startsWith("https://") && site;

  return [
    { name: "База данных", ok: database, detail: database ? "Соединение установлено" : "Нет соединения" },
    {
      name: "Robokassa",
      ok: configuration.robokassa.configured &&
        configuration.robokassa.resultUrlMatches &&
        configuration.robokassa.successUrlMatches &&
        configuration.robokassa.failUrlMatches,
      detail: configuration.robokassa.configured ? "Настройки и callback URL проверены" : "Не настроена",
    },
    { name: "SMTP", ok: smtp, detail: smtp ? "Сервер отвечает" : "Не настроен или не отвечает" },
    {
      name: "Яндекс Метрика",
      ok: Boolean(process.env.YANDEX_METRIKA_ID?.trim()),
      detail: process.env.YANDEX_METRIKA_ID?.trim() ? "Идентификатор задан" : "Идентификатор не задан",
    },
    {
      name: "VK Pixel",
      ok: Boolean(process.env.VK_PIXEL_ID?.trim()),
      detail: process.env.VK_PIXEL_ID?.trim() ? "Идентификатор задан" : "Идентификатор не задан",
    },
    { name: "Sitemap", ok: sitemap, detail: sitemap ? "HTTP 200" : "Недоступен" },
    { name: "Robots", ok: robots, detail: robots ? "HTTP 200" : "Недоступен" },
    {
      name: "Почта",
      ok: isEmailConfigured() && Boolean(env.ORDER_NOTIFICATION_EMAIL),
      detail: env.ORDER_NOTIFICATION_EMAIL ? "Адрес уведомлений задан" : "Адрес уведомлений не задан",
    },
    { name: "SSL", ok: ssl, detail: ssl ? "HTTPS доступен" : "HTTPS недоступен" },
    {
      name: "Vercel",
      ok: Boolean(process.env.VERCEL) && site,
      detail: process.env.VERCEL ? (site ? "Deployment отвечает" : "Deployment не отвечает") : "Не среда Vercel",
    },
  ];
}
