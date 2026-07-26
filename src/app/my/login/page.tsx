import { sendLoginLink } from "../actions";

export default async function MyLoginPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const params = await searchParams;
  return <main className="section-light" style={{minHeight:"100vh"}}>
    <p className="eyebrow">Личный кабинет</p><h1>Вход по email</h1>
    {params.sent ? <p className="lead" style={{color:"#121212"}}>Одноразовая ссылка отправлена. Проверьте почту.</p> :
      <form action={sendLoginLink} className="admin-panel admin-form">
        <label>Email<input name="email" type="email" required /></label>
        {params.error && <p className="form-error">Проверьте email.</p>}
        <button className="button">Получить ссылку для входа</button>
      </form>}
  </main>;
}
