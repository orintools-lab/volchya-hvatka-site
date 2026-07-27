import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveDigitalDelivery } from "@/server/services/digital-delivery-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Доступ к курсу",
  robots: { index: false, follow: false },
};

const messages = {
  INVALID: "Ссылка недействительна",
  EXPIRED: "Срок действия ссылки истёк",
  NOT_ACTIVE: "Доступ к курсу ещё не активирован",
  REVOKED: "Доступ был отозван",
} as const;

export default async function CourseDownloadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await resolveDigitalDelivery(token);
  if (result.ok) redirect(result.sourceUrl);
  return <main className="section-light" style={{ minHeight: "100vh" }}>
    <p className="eyebrow">Волчья Хватка</p>
    <h1>{messages[result.reason]}</h1>
    <p>Если вам нужна новая ссылка, свяжитесь с нами и укажите номер заказа.</p>
    <Link className="button" href="/">Вернуться на главную</Link>
  </main>;
}
