import { z } from "zod";
import { getRobokassaCallbackUrls } from "./site-url";

const optionalString = z.string().trim().optional().default("");
const optionalPositiveInt = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

const schema = z.object({
  DATABASE_URL: optionalString,
  NEXT_PUBLIC_SITE_URL: z.string().url().default("https://flankirovka1.ru"),
  AUTH_SECRET: z.string().min(16).optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(10).optional(),
  PAYMENT_PROVIDER: z.enum(["robokassa", "mock"]).default("robokassa"),
  ROBOKASSA_MERCHANT_LOGIN: optionalString,
  ROBOKASSA_PASSWORD_1: optionalString,
  ROBOKASSA_PASSWORD_2: optionalString,
  ROBOKASSA_TEST_MODE: z.enum(["true", "false"]).default("true"),
  ROBOKASSA_HASH_ALGORITHM: z.preprocess(
    (value) => typeof value === "string" ? value.trim().toLowerCase() : value,
    z.enum(["md5", "sha256", "sha384", "sha512"]).default("md5"),
  ),
  ROBOKASSA_RESULT_URL: optionalString,
  ROBOKASSA_SUCCESS_URL: optionalString,
  ROBOKASSA_FAIL_URL: optionalString,
  DELIVERY_PROVIDERS: z.string().default("cdek"),
  CDEK_CLIENT_ID: optionalString,
  CDEK_CLIENT_SECRET: optionalString,
  CDEK_API_URL: z.string().url().default("https://api.edu.cdek.ru/v2"),
  CDEK_SENDER_CITY_CODE: optionalPositiveInt,
  CDEK_DEFAULT_TARIFF_CODE: optionalPositiveInt,
  CDEK_ACCOUNT_MODE: z.enum(["test", "production"]).default("test"),
  OZON_DELIVERY_ENABLED: z.enum(["true", "false"]).default("false"),
  SMTP_HOST: optionalString,
  SMTP_PORT: z.preprocess(
    (value) => (value === "" || value === undefined ? 587 : value),
    z.coerce.number().int().positive(),
  ),
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  ORDER_NOTIFICATION_EMAIL: optionalString,
});

export const env = schema.parse(process.env);

function matchesUrl(actual: string, expected: string) {
  if (!actual) return false;
  try {
    const normalized = new URL(actual);
    const target = new URL(expected);
    return normalized.origin === target.origin &&
      normalized.pathname.replace(/\/$/, "") === target.pathname;
  } catch {
    return false;
  }
}

export function getIntegrationConfiguration() {
  const expectedCdekUrl =
    env.CDEK_ACCOUNT_MODE === "test"
      ? "https://api.edu.cdek.ru/v2"
      : "https://api.cdek.ru/v2";

  return {
    cdek: {
      credentialsConfigured: Boolean(env.CDEK_CLIENT_ID && env.CDEK_CLIENT_SECRET),
      checkoutConfigured: Boolean(
        env.CDEK_CLIENT_ID &&
          env.CDEK_CLIENT_SECRET &&
          env.CDEK_SENDER_CITY_CODE &&
          env.CDEK_DEFAULT_TARIFF_CODE
      ),
      mode: env.CDEK_ACCOUNT_MODE,
      apiUrlMatchesMode: matchesUrl(env.CDEK_API_URL, expectedCdekUrl),
      senderCityConfigured: Boolean(env.CDEK_SENDER_CITY_CODE),
      defaultTariffConfigured: Boolean(env.CDEK_DEFAULT_TARIFF_CODE),
    },
    robokassa: {
      configured: Boolean(
        env.ROBOKASSA_MERCHANT_LOGIN &&
        env.ROBOKASSA_PASSWORD_1 &&
        env.ROBOKASSA_PASSWORD_2
      ),
      testMode: env.ROBOKASSA_TEST_MODE === "true",
      hashAlgorithm: env.ROBOKASSA_HASH_ALGORITHM,
      callbackSource: "NEXT_PUBLIC_SITE_URL" as const,
      callbackUrls: getRobokassaCallbackUrls(),
      resultUrlMatches: matchesUrl(
        env.ROBOKASSA_RESULT_URL,
        getRobokassaCallbackUrls().result,
      ),
      successUrlMatches: matchesUrl(
        env.ROBOKASSA_SUCCESS_URL,
        getRobokassaCallbackUrls().success,
      ),
      failUrlMatches: matchesUrl(
        env.ROBOKASSA_FAIL_URL,
        getRobokassaCallbackUrls().fail,
      ),
    },
  };
}

export function assertCdekConfigured() {
  const configuration = getIntegrationConfiguration().cdek;
  if (!configuration.credentialsConfigured) {
    throw new Error("СДЭК не настроен. Заполните CDEK_CLIENT_ID и CDEK_CLIENT_SECRET.");
  }
  if (!configuration.apiUrlMatchesMode) {
    throw new Error("CDEK_API_URL не соответствует выбранному CDEK_ACCOUNT_MODE.");
  }
}

export function assertCdekCheckoutConfigured() {
  assertCdekConfigured();
  if (!env.CDEK_SENDER_CITY_CODE) {
    throw new Error("Не задан CDEK_SENDER_CITY_CODE.");
  }
  if (!env.CDEK_DEFAULT_TARIFF_CODE) {
    throw new Error("Не задан CDEK_DEFAULT_TARIFF_CODE.");
  }
}

export function assertRobokassaConfigured() {
  const configuration = getIntegrationConfiguration().robokassa;
  if (!configuration.configured) {
    throw new Error("Робокасса не настроена. Заполните логин и оба пароля.");
  }
  if (
    !configuration.resultUrlMatches ||
    !configuration.successUrlMatches ||
    !configuration.failUrlMatches
  ) {
    throw new Error("Callback URL Робокассы не соответствуют NEXT_PUBLIC_SITE_URL.");
  }
}
