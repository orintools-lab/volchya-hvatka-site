import Link from "next/link";

export default function FailPage() {
  return <main className="section-light" style={{minHeight:"100vh"}}>
    <p className="eyebrow">Оплата не завершена</p><h1>Заказ сохранён</h1>
    <p className="lead" style={{color:"#121212"}}>Списание не подтверждено. Вернитесь к заказу или свяжитесь с нами, чтобы повторить оплату.</p>
    <Link className="button" href="/">Вернуться на главную</Link>
  </main>;
}
