import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-at-least-sixteen-characters";
  process.env.NEXT_PUBLIC_SITE_URL = "https://example.test";
});

describe("secure public tokens", () => {
  it("creates a cryptographically random opaque token and stores a different hash", async () => {
    const { createPaymentToken } = await import("../src/server/services/payment-link");
    const first = createPaymentToken();
    const second = createPaymentToken();
    expect(first.token).not.toBe(second.token);
    expect(first.hash).not.toBe(first.token);
    expect(first.token).not.toContain("order-123");
    expect(first.token).not.toContain("course-456");
    expect(first.token.length).toBeGreaterThanOrEqual(40);
  });

  it("can recover an admin-visible token from authenticated encryption", async () => {
    const { createPaymentToken, decryptPaymentToken } = await import("../src/server/services/payment-link");
    const generated = createPaymentToken();
    expect(decryptPaymentToken(generated.encrypted)).toBe(generated.token);
  });

  it("detects an expired payment link", async () => {
    const { isPaymentLinkExpired, paymentLinkExpiry } = await import("../src/server/services/payment-link");
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(isPaymentLinkExpired(paymentLinkExpiry(72, now), now)).toBe(false);
    expect(isPaymentLinkExpired(new Date(now.getTime() - 1), now)).toBe(true);
  });

  it("builds a public URL without payment or order IDs", async () => {
    const { publicPaymentUrl } = await import("../src/server/services/payment-link");
    const url = publicPaymentUrl("opaque-token");
    expect(url).toBe("https://example.test/pay/opaque-token");
    expect(url).not.toContain("orderId");
    expect(url).not.toContain("paymentId");
  });
});
