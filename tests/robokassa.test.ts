import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.ROBOKASSA_MERCHANT_LOGIN = "demo";
  process.env.ROBOKASSA_PASSWORD_1 = "password-one";
  process.env.ROBOKASSA_PASSWORD_2 = "password-two";
  process.env.ROBOKASSA_HASH_ALGORITHM = "md5";
  process.env.ROBOKASSA_TEST_MODE = "true";
  process.env.NEXT_PUBLIC_SITE_URL = "https://volchya-hvatka-site.vercel.app";
  process.env.ROBOKASSA_RESULT_URL =
    "https://volchya-hvatka-site.vercel.app/api/payments/robokassa/result";
  process.env.ROBOKASSA_SUCCESS_URL =
    "https://volchya-hvatka-site.vercel.app/payment/success";
  process.env.ROBOKASSA_FAIL_URL =
    "https://volchya-hvatka-site.vercel.app/payment/fail";
});

describe("RobokassaPaymentProvider", () => {
  it("формирует production-provider URL с InvoiceID и тестовым режимом", async () => {
    const { RobokassaPaymentProvider } = await import("../src/lib/payments/robokassa");
    const url = new URL(new RobokassaPaymentProvider().createPaymentUrl({
      invoiceId: 12345,
      amount: "7990.00",
      description: "Оплата заказа VH-1",
      email: "buyer@example.com",
    }));
    expect(url.origin + url.pathname).toBe("https://auth.robokassa.ru/Merchant/Index.aspx");
    expect(url.searchParams.get("InvId")).toBe("12345");
    expect(url.searchParams.get("OutSum")).toBe("7990.00");
    expect(url.searchParams.get("IsTest")).toBe("1");
    expect(url.searchParams.get("SignatureValue")).toMatch(/^[a-f0-9]{32}$/);
  });

  it("отклоняет неверную ResultURL подпись", async () => {
    const { RobokassaPaymentProvider } = await import("../src/lib/payments/robokassa");
    expect(new RobokassaPaymentProvider().verifyResult({
      amount: "7990.00",
      invoiceId: 12345,
      signature: "00000000000000000000000000000000",
    })).toBe(false);
  });

  it("подтверждает безопасную test-конфигурацию callback URL", async () => {
    const { getIntegrationConfiguration } = await import("../src/lib/config/env");
    expect(getIntegrationConfiguration().robokassa).toMatchObject({
      configured: true,
      testMode: true,
      resultUrlMatches: true,
      successUrlMatches: true,
      failUrlMatches: true,
    });
  });
});
