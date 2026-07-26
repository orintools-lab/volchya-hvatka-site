"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function UpsellCountdown({ expiresAt }: { expiresAt: string }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(() =>
    Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000),
      );
      setSeconds(remaining);
      if (remaining === 0) {
        window.clearInterval(timer);
        router.refresh();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiresAt, router]);

  const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
  const rest = String(seconds % 60).padStart(2, "0");
  return <strong aria-label="До конца предложения">{minutes}:{rest}</strong>;
}
