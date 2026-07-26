import { getCheckoutPaymentMode } from "@/server/services/checkout-payment-mode";
import { updateCheckoutSettings } from "../../../actions";

export const dynamic = "force-dynamic";

const options = [
  {
    value: "PAY_AFTER_DELIVERY_AGREEMENT",
    title: "Согласование доставки перед оплатой",
    description: "Заказ создаётся без оплаты. После согласования доставки администратор отправляет покупателю ссылку на оплату.",
  },
  {
    value: "PAY_IMMEDIATELY",
    title: "Сначала оплата, потом согласование доставки",
    description: "После оформления заказа покупатель сразу переходит в Robokassa. Доставка согласовывается отдельно после оплаты.",
  },
] as const;

export default async function CheckoutSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [mode, query] = await Promise.all([
    getCheckoutPaymentMode(),
    searchParams,
  ]);

  return <>
    <header className="admin-page-head">
      <div><p>Настройки</p><h1>Оформление заказа</h1></div>
    </header>
    {query.saved === "1" && (
      <p className="admin-panel" role="status">Настройки оформления заказа сохранены</p>
    )}
    <form action={updateCheckoutSettings} className="admin-panel admin-form">
      <h2>Порядок оплаты заказа</h2>
      {options.map((option) => (
        <label className="check" key={option.value}>
          <input
            type="radio"
            name="checkoutPaymentMode"
            value={option.value}
            defaultChecked={mode === option.value}
            required
          />
          <span><strong>{option.title}</strong><br />{option.description}</span>
        </label>
      ))}
      <button className="button">Сохранить настройки</button>
    </form>
  </>;
}
