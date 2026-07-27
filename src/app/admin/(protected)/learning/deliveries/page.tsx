import { db } from "@/lib/db/client";
import { CopyLink } from "@/components/admin/copy-link";
import { getDigitalDeliveryPublicUrl } from "@/server/services/digital-delivery-service";
import { resendDigitalDeliveryEmail, updateDigitalDelivery } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function DigitalDeliveriesPage() {
  const deliveries = await db.digitalDelivery.findMany({
    include: {
      order: { include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } } },
      course: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return <>
    <header className="admin-page-head"><div><p>Обучение</p><h1>Выдача материалов</h1></div></header>
    {deliveries.length === 0 ? <section className="admin-panel"><p>Выданных материалов пока нет</p></section> :
      <div className="admin-card-grid">{await Promise.all(deliveries.map(async (delivery) => {
        const url = await getDigitalDeliveryPublicUrl(delivery);
        return <article className="admin-panel" key={delivery.id}>
          <p>{delivery.createdAt.toLocaleString("ru-RU")}</p>
          <h2>{delivery.course.title}</h2>
          <p>Заказ: {delivery.order.number}</p>
          <p>Покупатель: {delivery.order.customerName} · {delivery.customerEmail}</p>
          <p>Оплата: {delivery.order.payments[0]?.status ?? "NOT_CREATED"}</p>
          <p>Выдача: {delivery.status}</p>
          <p>Email: {delivery.emailSentAt ? delivery.emailSentAt.toLocaleString("ru-RU") : delivery.lastEmailError ?? "не отправлен"}</p>
          <p>VK: {delivery.vkSentAt ? delivery.vkSentAt.toLocaleString("ru-RU") : "не отправлен — нет подтверждённого разрешения"}</p>
          <p>Открытий: {delivery.openCount}</p>
          <p>Действует до: {delivery.expiresAt?.toLocaleDateString("ru-RU") ?? "бессрочно"}</p>
          <div className="actions"><CopyLink url={url}/><a className="button-secondary" href={url} target="_blank" rel="noreferrer">Открыть</a></div>
          <form action={resendDigitalDeliveryEmail}><input type="hidden" name="deliveryId" value={delivery.id}/><button className="button-secondary">Повторно отправить email</button></form>
          <form action={updateDigitalDelivery}><input type="hidden" name="deliveryId" value={delivery.id}/><input type="hidden" name="operation" value="renew"/><button className="button-secondary">Создать новую ссылку</button></form>
          <form action={updateDigitalDelivery}><input type="hidden" name="deliveryId" value={delivery.id}/><input type="hidden" name="operation" value="extend"/><select name="days" defaultValue="365"><option>30</option><option>90</option><option>180</option><option>365</option></select><button className="button-secondary">Продлить доступ</button></form>
          <form action={updateDigitalDelivery}><input type="hidden" name="deliveryId" value={delivery.id}/><input type="hidden" name="operation" value="revoke"/><button className="button-secondary">Отозвать доступ</button></form>
        </article>;
      }))}</div>}
  </>;
}
