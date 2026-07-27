"use client";

import { useState } from "react";
import { recordPaymentLinkCopied } from "@/app/admin/actions";

export function PaymentLinkActions({
  orderId,
  paymentId,
  url,
}: {
  orderId: string;
  paymentId: string;
  url: string;
}) {
  const [message, setMessage] = useState("");

  async function copy() {
    await navigator.clipboard.writeText(url);
    setMessage("Ссылка скопирована");
    try {
      await recordPaymentLinkCopied(orderId, paymentId);
    } catch {}
  }

  return <div className="admin-form">
    <label>Ссылка на оплату
      <input value={url} readOnly onFocus={(event) => event.currentTarget.select()} />
    </label>
    <div className="actions">
      <button className="button" type="button" onClick={copy}>Скопировать ссылку</button>
      <a className="button-secondary" href={url} target="_blank" rel="noreferrer">Открыть ссылку</a>
    </div>
    {message && <p role="status">{message}</p>}
  </div>;
}
