import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { UpsellCountdown } from "@/components/public/upsell-countdown";
import { isOfferActive } from "@/server/services/upsell-policy";
import { registerUpsellView } from "@/server/services/upsell-service";
import { acceptUpsell } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Спасибо за заказ",
  robots: { index: false, follow: false },
};

function Video({ url }: { url: string }) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com") || parsed.hostname === "youtu.be") {
      const id = parsed.hostname === "youtu.be" ? parsed.pathname.slice(1) : parsed.searchParams.get("v");
      if (!id) return null;
      return <iframe title="Курс Мастер" src={`https://www.youtube.com/embed/${id}`} allowFullScreen loading="lazy" />;
    }
    if (parsed.hostname.includes("rutube.ru") || parsed.hostname.includes("vkvideo.ru") || parsed.hostname.includes("vk.com")) {
      return <iframe title="Курс Мастер" src={url} allowFullScreen loading="lazy" />;
    }
    if (parsed.pathname.toLowerCase().endsWith(".mp4")) {
      return <video controls preload="metadata"><source src={url} type="video/mp4" /></video>;
    }
  } catch {}
  return null;
}

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ InvId?: string }> }) {
  const invoiceId = Number((await searchParams).InvId);
  if (!Number.isInteger(invoiceId)) notFound();
  const payment = await db.payment.findUnique({
    where: { invoiceId },
    include: {
      order: { include: { items: true, upsellOffer: true } },
      upsellOffer: { include: { order: { include: { items: true } } } },
    },
  });
  if (!payment || payment.status !== "SUCCEEDED") notFound();
  const order = payment.order ?? payment.upsellOffer?.order;
  if (!order) notFound();
  const settings = await db.upsellSettings.findUnique({ where: { id: "default" } });
  const initialOffer = payment.order?.upsellOffer ?? payment.upsellOffer;
  const offer = initialOffer ? await registerUpsellView(initialOffer.id) : null;
  const active = Boolean(settings?.enabled && offer && isOfferActive(offer));
  const accepted = offer?.status === "ACCEPTED";
  const delivery = order.deliveryProvider === "CDEK"
    ? `${order.cdekTariffName ?? "СДЭК"}: ${order.cdekPointAddress ?? order.deliveryAddress ?? ""}`
    : "Доставка по согласованию";

  return <main className="section-light" style={{minHeight:"100vh"}}>
    <p className="eyebrow">Заказ оплачен</p>
    <h1>Спасибо за заказ!</h1>
    <p className="lead" style={{color:"#121212"}}>Ваш заказ успешно оплачен.<br />В ближайшее время мы отправим письмо со всей информацией.</p>
    <section className="admin-panel">
      <p>✓ Номер заказа: <strong>{order.number}</strong></p>
      <p>✓ Состав: <strong>{order.items.map((item) => `${item.productName} × ${item.quantity}`).join(", ")}</strong></p>
      <p>✓ Итоговая сумма: <strong>{order.total?.toFixed(2)} ₽</strong></p>
      <p>✓ Способ доставки: <strong>{delivery}</strong></p>
      <p>✓ Статус оплаты: <strong>SUCCEEDED</strong></p>
    </section>
    {settings && offer && !accepted && <section className="admin-panel" style={{marginTop:"2rem"}}>
      {active ? <>
        <h2>{settings.title}</h2>
        <p>{settings.text}<br />всего за</p>
        <p><s>{offer.regularPrice.toFixed(0)} ₽</s></p>
        <p style={{color:"#D89A37",fontSize:"2.5rem",fontWeight:800}}>{offer.specialPrice.toFixed(0)} ₽</p>
        <UpsellCountdown expiresAt={offer.expiresAt.toISOString()} />
        <Video url={settings.videoUrl ?? ""} />
        <form action={acceptUpsell}>
          <input type="hidden" name="offerId" value={offer.id} />
          <button className="button">Получить курс «Мастер» за {offer.specialPrice.toFixed(0)} ₽</button>
        </form>
      </> : <>
        <h2>Срок действия специального предложения истёк.</h2>
        <p>Цена курса: <strong>{offer.regularPrice.toFixed(0)} ₽</strong></p>
        <Link className="button" href="/#products">Купить курс «Мастер»</Link>
      </>}
    </section>}
    {accepted && <section className="admin-panel" style={{marginTop:"2rem"}}><h2>Курс «Мастер» добавлен</h2><p>Повторная покупка этого предложения невозможна.</p></section>}
    <Link className="button" href="/my">Перейти в личный кабинет</Link>
    <Link className="button-secondary" href="/">Вернуться на главную</Link>
  </main>;
}
