import { db } from "@/lib/db/client";
import { validateLengthRules } from "@/server/services/length-service";
import { saveLengthRule } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function LengthRulesPage() {
  const rules = await db.lengthRule.findMany({ orderBy: [{ minHeightCm: "asc" }, { sortOrder: "asc" }] });
  const validation = validateLengthRules(rules);
  return <>
    <header className="admin-page-head"><div><p>Товары</p><h1>Подбор длины по росту</h1></div></header>
    {validation.gaps.length > 0 && <section className="admin-panel"><strong>Непокрытые диапазоны:</strong> {validation.gaps.map((gap) => `${gap.from}–${gap.to} см`).join(", ")}</section>}
    <section className="admin-panel">
      <h2>Правила</h2>
      {rules.length === 0 && <p>Правила пока не настроены. До настройки длину уточняет менеджер.</p>}
      {rules.map((rule) => <form action={saveLengthRule} className="admin-form" key={rule.id}>
        <input type="hidden" name="id" value={rule.id} />
        <label>Название<input name="label" defaultValue={rule.label} required /></label>
        <label>Рост от<input name="minHeightCm" type="number" defaultValue={rule.minHeightCm} required /></label>
        <label>Рост до (пусто = без верхней границы)<input name="maxHeightCm" type="number" defaultValue={rule.maxHeightCm ?? ""} /></label>
        <label>Длина шашки<input name="lengthCm" type="number" defaultValue={rule.lengthCm} required /></label>
        <label className="check"><input name="isActive" type="checkbox" defaultChecked={rule.isActive} /> Активно</label>
        <button className="button-secondary">Сохранить правило</button>
      </form>)}
    </section>
    <form action={saveLengthRule} className="admin-panel admin-form">
      <h2>Добавить правило</h2>
      <label>Название<input name="label" required /></label>
      <label>Рост от<input name="minHeightCm" type="number" required /></label>
      <label>Рост до (пусто = без верхней границы)<input name="maxHeightCm" type="number" /></label>
      <label>Длина шашки<input name="lengthCm" type="number" required /></label>
      <label className="check"><input name="isActive" type="checkbox" defaultChecked /> Активно</label>
      <button className="button">Добавить</button>
    </form>
  </>;
}
