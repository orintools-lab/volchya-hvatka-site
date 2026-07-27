import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getSystemHealth } from "@/server/services/health-service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Состояние системы",
  robots: { index: false, follow: false },
};

export default async function HealthPage() {
  await requireAdmin();
  const checks = await getSystemHealth();

  return <main className="admin-main">
    <header className="admin-page-head">
      <div><p>Техническая диагностика</p><h1>Состояние системы</h1></div>
      <Link className="button-secondary" href="/admin">Вернуться в админку</Link>
    </header>
    <section className="admin-panel">
      <table>
        <thead><tr><th>Проверка</th><th>Статус</th></tr></thead>
        <tbody>
          {checks.map((check) => <tr key={check.name}>
            <td>{check.name}</td>
            <td><strong aria-label={check.ok ? "Работает" : "Ошибка"}>{check.ok ? "✅" : "❌"}</strong> {check.detail}</td>
          </tr>)}
        </tbody>
      </table>
    </section>
  </main>;
}
