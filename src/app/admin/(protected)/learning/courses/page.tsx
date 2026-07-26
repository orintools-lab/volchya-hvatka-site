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
      <label className="check"><input name="active" type="checkbox" defaultChecked={course.active}/> Активен</label><button className="button-secondary">Сохранить</button></form>)}
    <form action={saveCourse} className="admin-panel admin-form"><h2>Новый курс</h2><label>Slug<input name="slug" required/></label><label>Название<input name="title" required/></label><label>Описание<textarea name="description" required/></label><label>Цена<input name="regularPrice" type="number" required/></label><label className="check"><input name="active" type="checkbox" defaultChecked/> Активен</label><button className="button">Создать</button></form>
  </>;
}
