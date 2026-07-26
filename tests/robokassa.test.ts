import { beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";

beforeAll(() => {
  process.env.ROBOKASSA_MERCHANT_LOGIN = "demo";
  process.env.ROBOKASSA_PASSWORD_1 = "password-one";
  process.env.ROBOKASSA_PASSWORD_2 = "password-two";
  process.env.ROBOKASSA_HASH_ALGORITHM = "md5";
  process.env.ROBOKASSA_TEST_MODE = "true";
  process.env.NEXT_PUBLIC_SITE_URL = "https://example.test";
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
    expect(url.searchParams.get("ResultUrl2")).toBe(
      "https://example.test/api/payments/robokassa/result",
    );
    expect(url.searchParams.get("SuccessUrl2")).toBe(
      "https://example.test/payment/success",
    );
    expect(url.searchParams.get("FailUrl2")).toBe(
      "https://example.test/payment/fail",
    );
    const expectedSignature = createHash("md5").update([
      "demo",
      "7990.00",
      "12345",
      "https://example.test/api/payments/robokassa/result",
      "https://example.test/payment/success",
      "GET",
      "https://example.test/payment/fail",
      "GET",
      "password-one",
    ].join(":")).digest("hex");
    expect(url.searchParams.get("SignatureValue")).toBe(expectedSignature);
  });

  it("отклоняет неверную ResultURL подпись", async () => {
    const { RobokassaPaymentProvider } = await import("../src/lib/payments/robokassa");
    expect(new RobokassaPaymentProvider().verifyResult({
      amount: "7990.00",
      invoiceId: 12345,
      signature: "00000000000000000000000000000000",
    })).toBe(false);
  });

  it("строит callback URL из единственного адреса сайта", async () => {
    const { getIntegrationConfiguration } = await import("../src/lib/config/env");
    expect(getIntegrationConfiguration().robokassa).toMatchObject({
      configured: true,
      testMode: true,
      callbackSource: "NEXT_PUBLIC_SITE_URL",
      callbackUrls: {
        result: "https://example.test/api/payments/robokassa/result",
        success: "https://example.test/payment/success",
        fail: "https://example.test/payment/fail",
      },
    });
  });
});
