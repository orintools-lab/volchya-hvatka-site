import type { Metadata } from "next";
import Link from "next/link";
import { getSellerDetails } from "@/server/services/seller-details";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Реквизиты продавца",
  description: "Юридические реквизиты продавца сайта «Волчья Хватка».",
  alternates: { canonical: "/seller-details" },
  openGraph: {
    title: "Реквизиты продавца",
    url: "/seller-details",
  },
  robots: { index: true, follow: true },
};

export default async function SellerDetailsPage() {
  const details = await getSellerDetails();
  const fields = [
    ["Полное наименование", details.sellerLegalName],
    ["Статус", "индивидуальный предприниматель"],
    ["ИНН", details.sellerInn],
    ["ОГРНИП", details.sellerOgrnip],
    ["Адрес", details.sellerAddress],
    ["Email", details.sellerEmail],
    ["Телефон", details.sellerPhone],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return <main className="section-light" style={{ minHeight: "70vh" }}>
    <Link href="/">← На главную</Link>
    <h1>Реквизиты продавца</h1>
    <dl className="seller-details-list">
      {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    <p>Продавец осуществляет дистанционную продажу товаров и цифровых материалов через сайт flankirovka1.ru.</p>
  </main>;
}
