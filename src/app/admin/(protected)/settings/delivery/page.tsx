import { db } from "@/lib/db/client";
import { getDeliveryOptions } from "@/server/services/delivery/providers";
import { updateDeliveryProviders } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function DeliverySettingsPage() {
  const [configs, statuses] = await Promise.all([
    db.deliveryProviderConfig.findMany({ orderBy: { provider: "asc" } }),
    getDeliveryOptions({ includeUnavailable: true }),
  ]);
  return <>
    <header className="admin-page-head"><div><p>Настройки</p><h1>Способы доставки</h1></div></header>
    <form action={updateDeliveryProviders} className="admin-panel admin-form">
      {configs.map((config) => {
        const status = statuses.find((item) => item.provider === config.provider);
        return <label className="check" key={config.provider}>
          <input type="checkbox" name={config.provider} defaultChecked={config.isEnabled} />
          <span><strong>{config.label}</strong><br />{config.description}<br />
            Статус: {status?.available ? "доступен" : status?.reason ?? "недоступен"}
          </span>
        </label>;
      })}
      <p>Ozon подготовлен архитектурно и не показывается покупателю до подключения настоящей интеграции.</p>
      <button className="button">Сохранить</button>
    </form>
  </>;
}
