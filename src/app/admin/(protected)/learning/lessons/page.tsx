import { db } from "@/lib/db/client";
import { saveLesson } from "../../../actions";
export const dynamic = "force-dynamic";
const providers = ["YANDEX_DISK","YOUTUBE","VK_VIDEO","RUTUBE","MP4"];
export default async function LessonsAdmin() {
  const [courses,lessons] = await Promise.all([db.course.findMany(),db.courseLesson.findMany({include:{course:true},orderBy:[{courseId:"asc"},{position:"asc"}]})]);
  return <><header className="admin-page-head"><div><p>Обучение</p><h1>Уроки</h1></div></header>
    {lessons.map((lesson)=><form action={saveLesson} className="admin-panel admin-form" key={lesson.id}><input type="hidden" name="id" value={lesson.id}/>
      <label>Курс<select name="courseId" defaultValue={lesson.courseId}>{courses.map(c=><option value={c.id} key={c.id}>{c.title}</option>)}</select></label><label>Название<input name="title" defaultValue={lesson.title}/></label>
      <label>Описание<textarea name="description" defaultValue={lesson.description ?? ""}/></label><label>Номер<input name="position" type="number" defaultValue={lesson.position}/></label>
      <label>Провайдер<select name="videoProvider" defaultValue={lesson.videoProvider}>{providers.map(p=><option key={p}>{p}</option>)}</select></label><label>Видео URL<input name="videoUrl" defaultValue={lesson.videoUrl ?? ""}/></label><label>Длительность, сек<input name="durationSeconds" type="number" defaultValue={lesson.durationSeconds ?? ""}/></label>
      <label className="check"><input name="active" type="checkbox" defaultChecked={lesson.active}/> Опубликован</label><button className="button-secondary">Сохранить</button></form>)}
    <form action={saveLesson} className="admin-panel admin-form"><h2>Новый урок</h2><label>Курс<select name="courseId">{courses.map(c=><option value={c.id} key={c.id}>{c.title}</option>)}</select></label><label>Название<input name="title" required/></label><label>Номер<input name="position" type="number" required/></label><label>Провайдер<select name="videoProvider">{providers.map(p=><option key={p}>{p}</option>)}</select></label><label>Видео URL<input name="videoUrl"/></label><label className="check"><input name="active" type="checkbox" defaultChecked/> Опубликован</label><button className="button">Создать</button></form>
  </>;
}
