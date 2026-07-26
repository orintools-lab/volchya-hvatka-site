import { db } from "@/lib/db/client";
import { grantCourseAccess, revokeCourseAccess } from "../../../actions";
export const dynamic = "force-dynamic";
export default async function AccessAdmin() {
  const [courses,accesses] = await Promise.all([db.course.findMany(),db.courseAccess.findMany({include:{customer:true,course:true},orderBy:{grantedAt:"desc"}})]);
  return <><header className="admin-page-head"><div><p>Обучение</p><h1>Доступы</h1></div></header>
    <form action={grantCourseAccess} className="admin-panel admin-form"><label>Email<input name="email" type="email" required/></label><label>Курс<select name="courseId">{courses.map(c=><option value={c.id} key={c.id}>{c.title}</option>)}</select></label><button className="button">Выдать доступ</button></form>
    <div className="admin-list">{accesses.map(a=><article className="admin-panel" key={a.id}><strong>{a.customer.email}</strong><p>{a.course.title} · {a.revokedAt ? "отозван" : "активен"}</p>{!a.revokedAt&&<form action={revokeCourseAccess}><input type="hidden" name="id" value={a.id}/><button className="button-secondary">Отозвать</button></form>}</article>)}</div>
  </>;
}
