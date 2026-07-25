import { db } from "@/lib/db/client";
import { updateContent } from "../../actions";

export default async function ContentPage() {
  const blocks = await db.contentBlock.findMany({
    where: { section: "hero" },
  });
  const values = new Map(blocks.map((block) => [block.key, block.value]));
  const stringValue = (key: string, fallback: string) => {
    const value = values.get(key);
    if (key === "hero.title" && value === "Тренировочные шашки и видеокурсы по фланкировке") {
      return fallback;
    }
    if (key === "hero.subtitle" && value === "Собственное производство. Работаем с 2015 года.") {
      return fallback;
    }
    return typeof value === "string" ? value : fallback;
  };
  const visible = values.get("hero.visible");

  return <><header className="admin-page-head"><div><p>Публичный сайт</p><h1>Контент</h1></div></header>
    <form action={updateContent} className="admin-panel admin-form"><h2>Первый экран</h2>
      <label>Надзаголовок<input name="hero.eyebrow" defaultValue={stringValue("hero.eyebrow", "СОБСТВЕННОЕ ПРОИЗВОДСТВО • С 2015 ГОДА")} required/></label>
      <label>Заголовок<textarea name="hero.title" defaultValue={stringValue("hero.title", "Тренировочные шашки\nи видеокурсы\nпо фланкировке")} rows={4} required/></label>
      <label>Подзаголовок<textarea name="hero.subtitle" defaultValue={stringValue("hero.subtitle", "Научитесь управлять шашкой свободно и уверенно. Пошаговые видеоуроки для любого уровня подготовки.")} rows={3} required/></label>
      <div className="admin-card-grid">
        <label>Основная кнопка<input name="hero.primaryButtonText" defaultValue={stringValue("hero.primaryButtonText", "Выбрать комплект")} required/></label>
        <label>Ссылка основной кнопки<input name="hero.primaryButtonTarget" defaultValue={stringValue("hero.primaryButtonTarget", "#products")} required/></label>
        <label>Вторая кнопка<input name="hero.secondaryButtonText" defaultValue={stringValue("hero.secondaryButtonText", "Смотреть видео")} required/></label>
        <label>Ссылка второй кнопки<input name="hero.secondaryButtonTarget" defaultValue={stringValue("hero.secondaryButtonTarget", "#video")} required/></label>
      </div>
      <label>URL изображения<input name="hero.imageUrl" defaultValue={stringValue("hero.imageUrl", "/images/hero-flankirovka.webp")} required/></label>
      <label>Alt изображения<input name="hero.imageAlt" defaultValue={stringValue("hero.imageAlt", "Фланкировка двумя тренировочными шашками на фоне гор")} required/></label>
      <label className="check"><input name="hero.visible" type="checkbox" defaultChecked={visible !== false}/><span>Показывать первый экран</span></label>
      <button className="button">Сохранить</button>
    </form></>;
}
