import { db } from "@/lib/db/client";
import {
  getCheckoutPaymentMode,
  getPaymentLinkExpiryHours,
} from "@/server/services/checkout-payment-mode";
import { updateCheckoutSettings } from "../../../actions";

export const dynamic = "force-dynamic";

const options = [
  {
    value: "PAY_AFTER_DELIVERY_AGREEMENT",
    title: "Сначала согласование доставки",
    description: "После оформления создаётся заявка. Мы связываемся с покупателем, уточняем способ и стоимость доставки, после чего создаём ссылку на оплату.",
  },
  {
    value: "PAY_IMMEDIATELY",
    title: "Сначала оплата",
    description: "После оформления покупатель сразу переходит в Robokassa. Стоимость доставки согласовывается отдельно после оплаты.",
  },
] as const;

export default async function PaymentSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [mode, expiryHours, query] = await Promise.all([
    getCheckoutPaymentMode(),
    getPaymentLinkExpiryHours(),
    searchParams,
  ]);
  const stored = await db.siteSetting.findUnique({ where: { key: "checkoutPaymentMode" } });

  return <>
    <header className="admin-page-head">
      <div><p>Настройки → Оплата</p><h1>Оплата и порядок оформления</h1></div>
    </header>
    {query.saved === "1" && <p className="admin-panel" role="status">Настройки оплаты сохранены</p>}
    <form action={updateCheckoutSettings} className="admin-panel admin-form">
      <h2>Порядок оплаты заказа</h2>
      {options.map((option) => <label className="check" key={option.value}>
        <input type="radio" name="checkoutPaymentMode" value={option.value} defaultChecked={mode === option.value} required />
        <span><strong>{option.title}</strong><br />{option.description}</span>
      </label>)}
      <label>Срок действия ссылки на оплату, часов
        <input name="paymentLinkExpiryHours" type="number" min="1" max="168" defaultValue={expiryHours} required />
      </label>
      <small>Текущее значение в БД: {typeof stored?.value === "string" ? stored.value : mode}</small>
      <button className="button">Сохранить настройки</button>
    </form>
  </>;
}
