import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Оплата не завершена",
  alternates: { canonical: "/payment/fail" },
  robots: { index: false, follow: false },
  openGraph: { url: "/payment/fail" },
};

export default function FailPage() {
  return <main className="section-light" style={{minHeight:"100vh"}}>
    <p className="eyebrow">Оплата не завершена</p><h1>Заказ сохранён</h1>
    <p className="lead" style={{color:"#121212"}}>Оплата не была завершена.<br />Вы можете повторить попытку.</p>
    <Link className="button" href="/">Вернуться на главную</Link>
  </main>;
}
