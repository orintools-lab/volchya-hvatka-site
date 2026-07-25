import { db } from "@/lib/db/client";
import { saveReview } from "../../actions";

export default async function ReviewsPage() {
  const reviews = await db.review.findMany({ orderBy:{sortOrder:"asc"} });
  return <><header className="admin-page-head"><div><p>Социальное подтверждение</p><h1>Отзывы</h1></div></header>
    <div className="admin-card-grid">
      <form action={saveReview} className="admin-panel admin-form"><h2>Новый отзыв</h2><ReviewFields/></form>
      {reviews.map((review)=><form action={saveReview} className="admin-panel admin-form" key={review.id}>
        <input type="hidden" name="id" value={review.id}/><ReviewFields review={review}/></form>)}
    </div></>;
}

function ReviewFields({review}:{review?:{authorName:string;city:string|null;text:string;rating:number;isVisible:boolean;showOnHomepage:boolean;sortOrder:number}}) {
  return <><label>Имя<input name="authorName" defaultValue={review?.authorName} required/></label>
    <label>Город<input name="city" defaultValue={review?.city ?? ""}/></label>
    <label>Текст<textarea name="text" defaultValue={review?.text} rows={4} required/></label>
    <label>Оценка<input name="rating" type="number" min="1" max="5" defaultValue={review?.rating ?? 5} required/></label>
    <label>Порядок<input name="sortOrder" type="number" min="0" defaultValue={review?.sortOrder ?? 0}/></label>
    <label className="check"><input name="isVisible" type="checkbox" defaultChecked={review?.isVisible ?? true}/> Видим</label>
    <label className="check"><input name="showOnHomepage" type="checkbox" defaultChecked={review?.showOnHomepage ?? true}/> На главной</label>
    <button className="button">Сохранить</button></>;
}
