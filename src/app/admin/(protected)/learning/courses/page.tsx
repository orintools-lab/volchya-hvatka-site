import { db } from "@/lib/db/client";
import { saveCourse } from "../../../actions";
export const dynamic = "force-dynamic";
export default async function CoursesAdmin() {
  const courses = await db.course.findMany({ orderBy: { createdAt: "asc" } });
  return <><header className="admin-page-head"><div><p>Обучение</p><h1>Курсы</h1></div></header>
    {courses.map((course)=><form action={saveCourse} className="admin-panel admin-form" key={course.id}>
      <input type="hidden" name="id" value={course.id}/><label>Slug<input name="slug" defaultValue={course.slug} required/></label>
      <label>Название<input name="title" defaultValue={course.title} required/></label><label>Описание<textarea name="description" defaultValue={course.description} required/></label>
      <label>Обложка<input name="coverImage" defaultValue={course.coverImage ?? ""}/></label><label>Цена<input name="regularPrice" type="number" defaultValue={course.regularPrice.toString()} required/></label>
      <label>Режим выдачи<select name="deliveryMode" defaultValue={course.deliveryMode}><option>DOWNLOAD_LINK</option><option>CUSTOMER_CABINET</option></select></label>
      <label>Ссылка Яндекс Диска<input name="sourceUrl" type="url" defaultValue={course.sourceUrl ?? ""} /></label>
      <label>Срок доступа, дней<input name="accessDurationDays" type="number" min="1" defaultValue={course.accessDurationDays ?? ""} placeholder="Пусто — бессрочно" /></label>
      <label>Шаблон письма<textarea name="emailTemplate" defaultValue={course.emailTemplate ?? ""} /></label>
      <label className="check"><input name="autoDeliveryEnabled" type="checkbox" defaultChecked={course.autoDeliveryEnabled}/> Автоматическая отправка</label>
      <label className="check"><input name="active" type="checkbox" defaultChecked={course.active}/> Активен</label><button className="button-secondary">Сохранить</button></form>)}
    <form action={saveCourse} className="admin-panel admin-form"><h2>Новый курс</h2><label>Slug<input name="slug" required/></label><label>Название<input name="title" required/></label><label>Описание<textarea name="description" required/></label><label>Цена<input name="regularPrice" type="number" required/></label><label>Режим выдачи<select name="deliveryMode"><option>DOWNLOAD_LINK</option><option>CUSTOMER_CABINET</option></select></label><label>Ссылка Яндекс Диска<input name="sourceUrl" type="url"/></label><label>Срок доступа, дней<input name="accessDurationDays" type="number" defaultValue="365"/></label><label className="check"><input name="autoDeliveryEnabled" type="checkbox" defaultChecked/> Автоматическая отправка</label><label className="check"><input name="active" type="checkbox" defaultChecked/> Активен</label><button className="button">Создать</button></form>
  </>;
}
