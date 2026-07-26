import { db } from "@/lib/db/client";
import { updateUpsellSettings } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function UpsellAdminPage() {
  const [settings, offers] = await Promise.all([
    db.upsellSettings.findUnique({ where: { id: "default" } }),
    db.upsellOffer.aggregate({
      _sum: { viewCount: true, clickCount: true },
      _count: { id: true },
    }),
  ]);
  const bought = await db.upsellOffer.count({ where: { status: "ACCEPTED" } });
  const views = offers._sum.viewCount ?? 0;
  const clicks = offers._sum.clickCount ?? 0;
  const conversion = views > 0 ? (bought / views) * 100 : 0;
  return <>
    <header className="admin-page-head"><div><p>Маркетинг</p><h1>Post-purchase Upsell</h1></div></header>
    <section className="stat-grid">
      {[["Увидели", views], ["Нажали", clicks], ["Купили", bought], ["Конверсия", `${conversion.toFixed(1)}%`]].map(([label, value]) =>
        <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
    </section>
    <form action={updateUpsellSettings} className="admin-panel admin-form">
      <h2>Настройки предложения</h2>
      <label className="check"><input name="enabled" type="checkbox" defaultChecked={settings?.enabled ?? true} /> Upsell включён</label>
      <label>Обычная цена, ₽<input name="regularPrice" type="number" min="1" step="0.01" defaultValue={settings?.regularPrice.toString() ?? "3390"} required /></label>
      <label>Специальная цена, ₽<input name="specialPrice" type="number" min="1" step="0.01" defaultValue={settings?.specialPrice.toString() ?? "2000"} required /></label>
      <label>Длительность, минут<input name="durationMinutes" type="number" min="1" defaultValue={settings?.durationMinutes ?? 5} required /></label>
      <label>Видео URL<input name="videoUrl" type="url" defaultValue={settings?.videoUrl ?? ""} placeholder="YouTube, VK Video, Rutube или mp4" /></label>
      <label>Заголовок<input name="title" defaultValue={settings?.title ?? "Специальное предложение только для новых учеников"} required /></label>
      <label>Текст<textarea name="text" rows={5} defaultValue={settings?.text ?? "Пока вы находитесь на этой странице, вы можете получить полный курс «Мастер»"} required /></label>
      <button className="button">Сохранить</button>
    </form>
  </>;
}
