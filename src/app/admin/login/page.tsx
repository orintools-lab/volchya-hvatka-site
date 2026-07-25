import Image from "next/image";
import { getAdmin } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { login } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getAdmin()) redirect("/admin");
  const { error } = await searchParams;
  return <main className="admin-login">
    <form action={login}>
      <Image src="/brand/logo-gold.png" alt="Волчья Хватка" width={640} height={540} />
      <h1>Вход в админку</h1>
      <label>Email<input name="email" type="email" required autoComplete="username" /></label>
      <label>Пароль<input name="password" type="password" required autoComplete="current-password" /></label>
      {error && <p role="alert">Неверный email или пароль.</p>}
      <button className="button">Войти</button>
    </form>
  </main>;
}
