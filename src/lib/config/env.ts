import { z } from "zod";

const optionalString = z.string().trim().optional().default("");
const optionalPositiveInt = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

const schema = z.object({
  DATABASE_URL: optionalString,
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(16).optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(10).optional(),
  PAYMENT_PROVIDER: z.enum(["robokassa", "mock"]).default("robokassa"),
  ROBOKASSA_MERCHANT_LOGIN: optionalString,
  ROBOKASSA_PASSWORD_1: optionalString,
  ROBOKASSA_PASSWORD_2: optionalString,
  ROBOKASSA_TEST_MODE: z.enum(["true", "false"]).default("true"),
  ROBOKASSA_HASH_ALGORITHM: z
    .enum(["md5", "sha256", "sha384", "sha512"])
    .default("md5"),
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

export function assertCdekConfigured() {
  if (
    !env.CDEK_CLIENT_ID ||
    !env.CDEK_CLIENT_SECRET ||
    !env.CDEK_SENDER_CITY_CODE
  ) {
    throw new Error("СДЭК не настроен. Заполните CDEK_CLIENT_ID, CDEK_CLIENT_SECRET и CDEK_SENDER_CITY_CODE.");
  }
}

export function assertRobokassaConfigured() {
  if (
    !env.ROBOKASSA_MERCHANT_LOGIN ||
    !env.ROBOKASSA_PASSWORD_1 ||
    !env.ROBOKASSA_PASSWORD_2
  ) {
    throw new Error("Робокасса не настроена. Заполните логин и оба пароля в environment.");
  }
}
