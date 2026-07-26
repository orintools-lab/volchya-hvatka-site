import { notFound } from "next/navigation";
import { requireCustomer } from "@/lib/auth/customer-session";
import { db } from "@/lib/db/client";
import { completeLesson } from "../../actions";

export const dynamic = "force-dynamic";

export default async function CustomerCoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const customer = await requireCustomer();
  const { slug } = await params;
  const access = await db.courseAccess.findFirst({
    where: { customerId: customer.id, revokedAt: null, course: { slug, active: true } },
    include: {
      course: {
        include: {
          lessons: {
            where: { active: true },
            orderBy: { position: "asc" },
            include: { progress: { where: { customerId: customer.id } } },
          },
        },
      },
    },
  });
  if (!access) notFound();
  const completed = access.course.lessons.filter((lesson) => lesson.progress.length > 0).length;
  return <main className="section-light" style={{minHeight:"100vh"}}>
    <p className="eyebrow">Мои курсы</p><h1>{access.course.title}</h1><p>{access.course.description}</p>
    <p><strong>Пройдено {completed} из {access.course.lessons.length} уроков</strong></p>
    <div className="admin-list">{access.course.lessons.map((lesson) => {
      const done = lesson.progress.length > 0;
      return <article className="admin-panel" key={lesson.id}>
        <h2>{lesson.position}. {lesson.title}</h2><p>{lesson.description}</p>
        <p>{done ? "Пройден" : "Не пройден"}{lesson.durationSeconds ? ` · ${Math.ceil(lesson.durationSeconds / 60)} мин.` : ""}</p>
        {lesson.videoUrl && <a className="button-secondary" href={lesson.videoUrl} target="_blank" rel="noreferrer">Смотреть урок</a>}
        {!done && <form action={completeLesson}><input type="hidden" name="lessonId" value={lesson.id} /><button className="button">Урок пройден</button></form>}
      </article>;
    })}</div>
  </main>;
}
