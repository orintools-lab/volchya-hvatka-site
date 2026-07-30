import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaymentStatus } from "../src/components/public/payment-status";
import {
  paymentReturnUrl,
  toPublicPaymentStatus,
} from "../src/lib/payments/public-status";
import { claimSuccessfulRobokassaPayment } from "../src/server/services/payment-result";

afterEach(cleanup);

describe("payment return", () => {
  it("SuccessURL without callback does not report PAID", () => {
    expect(toPublicPaymentStatus({
      invoiceId: 100,
      paymentStatus: "PENDING",
      orderStatus: "AWAITING_PAYMENT",
      orderNumber: "VH-100",
    }).paid).toBe(false);
  });

  it("a successful callback marks Payment SUCCEEDED and Order PAID", async () => {
    const paymentUpdate = vi.fn().mockResolvedValue({ count: 1 });
    const orderUpdate = vi.fn().mockResolvedValue({});
    const transaction = {
      payment: { updateMany: paymentUpdate },
      paymentEvent: { create: vi.fn().mockResolvedValue({}) },
      upsellOffer: { update: vi.fn().mockResolvedValue({}) },
      order: { update: orderUpdate },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    } as unknown as Prisma.TransactionClient;

    expect(await claimSuccessfulRobokassaPayment(transaction, {
      paymentId: "payment-1",
      orderId: "order-1",
      upsellOfferId: null,
      invoiceId: 100,
      amount: "2700.00",
      payload: { InvId: "100" },
      isDeliveryPayment: false,
    })).toBe(true);
    expect(paymentUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "SUCCEEDED" }),
    }));
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: "PAID" },
    });
  });

  it("a repeated callback is idempotent", async () => {
    const eventCreate = vi.fn();
    const orderUpdate = vi.fn();
    const transaction = {
      payment: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
      paymentEvent: { create: eventCreate },
      upsellOffer: { update: vi.fn() },
      order: { update: orderUpdate },
      auditLog: { create: vi.fn() },
    } as unknown as Prisma.TransactionClient;
    expect(await claimSuccessfulRobokassaPayment(transaction, {
      paymentId: "payment-1",
      orderId: "order-1",
      upsellOfferId: null,
      invoiceId: 100,
      amount: "2700.00",
      payload: {},
      isDeliveryPayment: false,
    })).toBe(false);
    expect(eventCreate).not.toHaveBeenCalled();
    expect(orderUpdate).not.toHaveBeenCalled();
  });

  it("FailURL keeps the browser on the fail page and preserves InvId", () => {
    expect(paymentReturnUrl("/payment/fail", { InvId: "100" }))
      .toBe("/payment/fail?InvId=100");
  });

  it("SuccessURL POST preserves the invoice for polling", () => {
    expect(paymentReturnUrl("/payment/success", { InvId: "100", OutSum: "2700.00" }))
      .toBe("/payment/success?InvId=100&OutSum=2700.00");
  });

  it("success UI appears only after callback state is confirmed", () => {
    render(<PaymentStatus
      invoiceId={100}
      initial={toPublicPaymentStatus({
        invoiceId: 100,
        paymentStatus: "SUCCEEDED",
        orderStatus: "PAID",
        orderNumber: "VH-100",
      })}
    />);
    expect(screen.getByText("Оплата прошла успешно")).toBeTruthy();
    expect(screen.getByText("VH-100")).toBeTruthy();
  });

  it("failed or pending payment never renders successful payment", () => {
    render(<PaymentStatus
      invoiceId={null}
      initial={toPublicPaymentStatus({
        invoiceId: 100,
        paymentStatus: "PENDING",
        orderStatus: "AWAITING_PAYMENT",
      })}
    />);
    expect(screen.queryByText("Оплата прошла успешно")).toBeNull();
    expect(screen.getByText("Платёж обрабатывается")).toBeTruthy();
  });

  it("test Password #2 validates ResultURL signatures", async () => {
    process.env.ROBOKASSA_MERCHANT_LOGIN = "demo";
    process.env.ROBOKASSA_PASSWORD_1 = "password-one";
    process.env.ROBOKASSA_PASSWORD_2 = "password-two";
    process.env.ROBOKASSA_HASH_ALGORITHM = "md5";
    process.env.ROBOKASSA_TEST_MODE = "true";
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.test";
    process.env.ROBOKASSA_RESULT_URL = "https://example.test/api/payments/robokassa/result";
    process.env.ROBOKASSA_SUCCESS_URL = "https://example.test/payment/success";
    process.env.ROBOKASSA_FAIL_URL = "https://example.test/payment/fail";
    const { RobokassaPaymentProvider } = await import("../src/lib/payments/robokassa");
    const signature = createHash("md5")
      .update("2700.00:100:password-two")
      .digest("hex");
    expect(new RobokassaPaymentProvider().verifyResult({
      amount: "2700.00",
      invoiceId: 100,
      signature,
    })).toBe(true);
  });

  it("an invalid signature is rejected", async () => {
    const { RobokassaPaymentProvider } = await import("../src/lib/payments/robokassa");
    expect(new RobokassaPaymentProvider().verifyResult({
      amount: "2700.00",
      invoiceId: 100,
      signature: "invalid",
    })).toBe(false);
  });
});
