"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicPaymentStatus } from "@/lib/payments/public-status";

const MAX_ATTEMPTS = 30;

export function PaymentStatus({
  invoiceId,
  initial,
}: {
  invoiceId: number | null;
  initial: PublicPaymentStatus;
}) {
  const [status, setStatus] = useState(initial);
  const [finished, setFinished] = useState(initial.paid || invoiceId === null);

  useEffect(() => {
    if (!invoiceId || status.paid) return;
    let attempts = 0;
    let cancelled = false;
    const check = async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/payments/status?InvId=${invoiceId}`, {
          cache: "no-store",
        });
        if (response.ok && !cancelled) {
          const next = await response.json() as PublicPaymentStatus;
          setStatus(next);
          if (next.paid) {
            setFinished(true);
            return;
          }
        }
      } catch {}
      if (attempts >= MAX_ATTEMPTS) {
        if (!cancelled) setFinished(true);
        return;
      }
      if (!cancelled) window.setTimeout(check, 2_000);
    };
    const timer = window.setTimeout(check, 1_000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [invoiceId, status.paid]);

  if (status.paid) {
    return <>
      <p className="eyebrow">Заказ оплачен</p>
      <h1>Оплата прошла успешно</h1>
      {status.orderNumber && <p className="lead" style={{ color: "#121212" }}>
        Номер заказа: <strong>{status.orderNumber}</strong>
      </p>}
      <Link className="button" href={status.continueUrl ?? "/"}>Продолжить</Link>
    </>;
  }

  return <>
    <p className="eyebrow">Статус платежа</p>
    <h1>{finished ? "Платёж обрабатывается" : "Проверяем оплату"}</h1>
    <p className="lead" style={{ color: "#121212" }}>
      {finished
        ? "Платёж обрабатывается. Обновите страницу позже."
        : "Ожидаем подтверждение от платёжной системы. Не закрывайте страницу."}
    </p>
    <Link className="button-secondary" href="/">Вернуться на главную</Link>
  </>;
}
