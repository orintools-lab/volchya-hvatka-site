import { db } from "@/lib/db/client";
import { updateContent } from "../../actions";

export default async function ContentPage() {
  const blocks = await db.contentBlock.findMany({ where: { key: { in: ["hero.title","hero.subtitle"] } } });
  const values = new Map(blocks.map((block)=>[block.key, typeof block.value === "string" ? block.value : ""]));
  return <><header className="admin-page-head"><div><p>Публичный сайт</p><h1>Контент</h1></div></header>
    <form action={updateContent} className="admin-panel admin-form"><h2>Первый экран</h2>
      <label>Заголовок<textarea name="hero.title" defaultValue={values.get("hero.title")} rows={3} required/></label>
      <label>Подзаголовок<textarea name="hero.subtitle" defaultValue={values.get("hero.subtitle")} rows={3} required/></label>
      <button className="button">Сохранить</button>
    </form></>;
}
