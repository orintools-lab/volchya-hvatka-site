"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return <button className="button-secondary" type="button" onClick={async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  }}>{copied ? "Ссылка скопирована" : "Скопировать внутреннюю ссылку"}</button>;
}
