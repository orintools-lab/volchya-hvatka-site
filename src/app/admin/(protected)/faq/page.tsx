import { db } from "@/lib/db/client";
import { saveFaq } from "../../actions";

export default async function FaqPage() {
  const items = await db.faqItem.findMany({ orderBy:{sortOrder:"asc"} });
  return <><header className="admin-page-head"><div><p>Публичный сайт</p><h1>FAQ</h1></div></header>
    <div className="admin-card-grid">
      <form action={saveFaq} className="admin-panel admin-form"><h2>Новый вопрос</h2><FaqFields/></form>
      {items.map((item)=><form action={saveFaq} className="admin-panel admin-form" key={item.id}>
        <input type="hidden" name="id" value={item.id}/><FaqFields item={item}/></form>)}
    </div></>;
}

function FaqFields({item}:{item?:{question:string;answer:string;isVisible:boolean;sortOrder:number}}) {
  return <><label>Вопрос<input name="question" defaultValue={item?.question} required/></label>
    <label>Ответ<textarea name="answer" defaultValue={item?.answer} rows={5} required/></label>
    <label>Порядок<input name="sortOrder" type="number" min="0" defaultValue={item?.sortOrder ?? 0}/></label>
    <label className="check"><input name="isVisible" type="checkbox" defaultChecked={item?.isVisible ?? true}/> Видим</label>
    <button className="button">Сохранить</button></>;
}
