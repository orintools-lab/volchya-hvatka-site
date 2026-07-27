import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/session";
import { logout } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return <div className="admin-shell">
    <aside>
      <Link className="admin-brand" href="/admin">Волчья Хватка</Link>
      <nav>
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/orders">Заказы</Link>
        <Link href="/admin/products">Товары</Link>
        <Link href="/admin/products/length-rules">Подбор длины</Link>
        <Link href="/admin/settings/delivery">Доставка</Link>
        <Link href="/admin/settings/payment">Настройки → Оплата</Link>
        <Link href="/admin/marketing/upsell">Маркетинг → Upsell</Link>
        <Link href="/admin/learning/courses">Обучение → Курсы</Link>
        <Link href="/admin/learning/lessons">Обучение → Уроки</Link>
        <Link href="/admin/learning/accesses">Обучение → Доступы</Link>
        <Link href="/admin/learning/deliveries">Обучение → Выдача материалов</Link>
        <Link href="/admin/content">Контент</Link>
        <Link href="/admin/reviews">Отзывы</Link>
        <Link href="/admin/faq">FAQ</Link>
        <Link href="/admin/payments">Платежи</Link>
        <Link href="/admin/logs">Логи</Link>
        <Link href="/" target="_blank">Открыть сайт ↗</Link>
      </nav>
      <div><small>{admin.email}</small><form action={logout}><button>Выйти</button></form></div>
    </aside>
    <main className="admin-main">{children}</main>
  </div>;
}
