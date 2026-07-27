import type { Metadata } from "next";
import { getSellerDetails, sellerDetailsComplete } from "@/server/services/seller-details";
import { updateSellerDetails } from "../../../actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Реквизиты продавца",
  robots: { index: false, follow: false },
};

export default async function SellerSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [details, query] = await Promise.all([getSellerDetails(), searchParams]);
  return <>
    <header className="admin-page-head">
      <div><p>Настройки → Продавец</p><h1>Реквизиты продавца</h1></div>
    </header>
    {!sellerDetailsComplete(details) && <section className="admin-panel" role="alert">
      <strong>Реквизиты заполнены не полностью.</strong>
      <p>До сохранения корректных данных пустые строки не публикуются в подвале сайта.</p>
    </section>}
    {query.saved === "1" && <p className="admin-panel" role="status">Реквизиты продавца сохранены</p>}
    <form action={updateSellerDetails} className="admin-panel admin-form">
      <label>Полное наименование ИП<input name="sellerLegalName" defaultValue={details.sellerLegalName ?? ""} required /></label>
      <label>ИНН<input name="sellerInn" inputMode="numeric" pattern="[0-9]{12}" minLength={12} maxLength={12} defaultValue={details.sellerInn ?? ""} required /></label>
      <label>ОГРНИП<input name="sellerOgrnip" inputMode="numeric" pattern="[0-9]{15}" minLength={15} maxLength={15} defaultValue={details.sellerOgrnip ?? ""} required /></label>
      <label>Адрес регистрации / адрес продавца<textarea name="sellerAddress" rows={3} defaultValue={details.sellerAddress ?? ""} required /></label>
      <label>Email<input name="sellerEmail" type="email" defaultValue={details.sellerEmail ?? ""} required /></label>
      <label>Телефон<input name="sellerPhone" type="tel" defaultValue={details.sellerPhone ?? ""} required /></label>
      <button className="button">Сохранить реквизиты</button>
    </form>
  </>;
}
