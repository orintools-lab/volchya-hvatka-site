const DEFAULT_SITE_URL = "https://flankirovka1.ru";

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
}

export function getAbsoluteSiteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, `${getSiteUrl()}/`).toString();
}

export function getRobokassaCallbackUrls() {
  return {
    result: getAbsoluteSiteUrl("/api/payments/robokassa/result"),
    success: getAbsoluteSiteUrl("/payment/success"),
    fail: getAbsoluteSiteUrl("/payment/fail"),
  };
}
