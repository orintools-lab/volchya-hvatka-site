"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Product = { id: string; name: string; price: string };
type City = { code: number; city: string; region?: string };
type Point = { code: string; name: string; address: string };
type DeliveryOption = {
  provider: "CDEK" | "MANUAL";
  label: string;
  description: string;
  available: boolean;
};

export function Checkout({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [deliveryProvider, setDeliveryProvider] = useState<"CDEK" | "MANUAL">("MANUAL");
  const [height, setHeight] = useState("");
  const [length, setLength] = useState<number>();
  const individualSizing = Number(height) > 0 && Number(height) < 100;
  const [cityQuery, setCityQuery] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [city, setCity] = useState<City>();
  const [points, setPoints] = useState<Point[]>([]);
  const [deliveryType, setDeliveryType] = useState<"PICKUP" | "COURIER">("PICKUP");
  const [pointCode, setPointCode] = useState("");
  const [address, setAddress] = useState("");
  const [quote, setQuote] = useState<{ id: string; price: string; tariffName: string }>();
  const [success, setSuccess] = useState<{
    orderNumber: string;
    productName: string;
    customerHeight: number;
    recommendedLengthCm: number | null;
    material: string;
    message: string;
  }>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/delivery/options")
      .then((response) => response.json())
      .then((options: DeliveryOption[]) => {
        setDeliveryOptions(options);
        if (!options.some((option) => option.provider === "CDEK")) setDeliveryProvider("MANUAL");
      })
      .catch(() => setDeliveryOptions([{
        provider: "MANUAL",
        label: "Доставка по согласованию",
        description: "После заявки мы свяжемся с вами и согласуем доставку.",
        available: true,
      }]));
  }, [open]);

  useEffect(() => {
    const numericHeight = Number(height);
    if (!Number.isInteger(numericHeight) || numericHeight < 1 || numericHeight > 250) {
      setLength(undefined);
      return;
    }
    const timeout = window.setTimeout(() => {
      fetch(`/api/length-recommendation?height=${numericHeight}`)
        .then((response) => response.json())
        .then((result) => {
          setLength(result.configured ? result.lengthCm : undefined);
          if (result.individual) setDeliveryProvider("MANUAL");
        })
        .catch(() => setLength(undefined));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [height]);

  useEffect(() => {
    if (individualSizing) {
      setDeliveryProvider("MANUAL");
      setQuote(undefined);
    }
  }, [individualSizing]);

  function fallbackToManual() {
    setDeliveryProvider("MANUAL");
    setQuote(undefined);
    setError("СДЭК временно недоступен. Оформите заявку — мы согласуем доставку лично.");
  }

  async function searchCity() {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/delivery/cities?q=${encodeURIComponent(cityQuery)}`);
      const data = await response.json();
      if (!response.ok) fallbackToManual(); else setCities(data);
    } catch { fallbackToManual(); }
    setLoading(false);
  }

  async function chooseCity(selected: City) {
    setCity(selected); setCities([]); setCityQuery(selected.city); setQuote(undefined);
    if (deliveryType === "PICKUP") {
      try {
        const response = await fetch(`/api/delivery/points?cityCode=${selected.code}`);
        const data = await response.json();
        if (!response.ok) fallbackToManual(); else setPoints(data);
      } catch { fallbackToManual(); }
    }
  }

  async function calculate() {
    if (!city) return setError("Сначала выберите город из найденного списка.");
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/delivery/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          productId: product.id, quantity: 1, cityCode: city.code, cityName: city.city,
          deliveryType, pointCode: pointCode || undefined, address: address || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) fallbackToManual(); else setQuote(data);
    } catch { fallbackToManual(); }
    setLoading(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!length && !individualSizing) return setError("Для указанного роста длина пока не настроена.");
    if (deliveryProvider === "CDEK" && !quote) return setError("Рассчитайте и подтвердите доставку.");
    setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        deliveryProvider,
        quoteId: quote?.id,
        customerName: form.get("customerName"),
        phone: form.get("phone"),
        email: form.get("email"),
        postalCode: form.get("postalCode") || undefined,
        customerHeight: Number(form.get("customerHeight")),
        comment: form.get("comment") || undefined,
        privacyAccepted: form.get("privacyAccepted") === "on",
        offerAccepted: form.get("offerAccepted") === "on",
      }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error);
    else if (data.requiresPayment && data.paymentUrl) window.location.assign(data.paymentUrl);
    else setSuccess({
      orderNumber: data.orderNumber,
      productName: data.productName,
      customerHeight: data.customerHeight,
      recommendedLengthCm: data.recommendedLengthCm,
      material: data.material,
      message: data.message,
    });
    setLoading(false);
  }

  return (
    <>
      <button className="button full" type="button" onClick={() => setOpen(true)}>Купить комплект</button>
      {open && (
        <div className="modal-backdrop" role="presentation">
          <div className="order-modal" role="dialog" aria-modal="true" aria-labelledby={`order-${product.id}`}>
            <button className="close" type="button" onClick={() => setOpen(false)} aria-label="Закрыть">×</button>
            {success ? (
              <div>
                <h2>Заявка оформлена</h2>
                <p>Номер заявки: <strong>{success.orderNumber}</strong></p>
                <p>Комплект: <strong>{success.productName}</strong></p>
                <p>Рост: <strong>{success.customerHeight} см</strong></p>
                <p>Рекомендуемая длина: <strong>{success.recommendedLengthCm ? `${success.recommendedLengthCm} см` : "требуется индивидуальный подбор"}</strong></p>
                <p>Материал: <strong>{success.material}</strong></p>
                <p>{success.message}</p>
                <button className="button full" type="button" onClick={() => setOpen(false)}>Готово</button>
              </div>
            ) : (
              <>
                <h2 id={`order-${product.id}`}>Оформление заказа</h2>
                <p><strong>{product.name}</strong> · {Number(product.price).toLocaleString("ru-RU")} ₽</p>
                <form onSubmit={submit}>
                  <div className="form-grid">
                    <label>ФИО<input name="customerName" required minLength={3} /></label>
                    <label>Телефон<input name="phone" type="tel" required /></label>
                    <label>Email<input name="email" type="email" required /></label>
                    <label>Ваш рост, см<input name="customerHeight" type="number" min="1" max="250" required value={height} onChange={(event) => setHeight(event.target.value)} /></label>
                    <label>Материал<input value="Берёзовая фанера" readOnly /></label>
                    <label>Почтовый индекс<input name="postalCode" /></label>
                  </div>
                  {individualSizing ? (
                    <p>Для роста менее 100 см требуется индивидуальный подбор. Оформите заявку, и мы свяжемся с вами.</p>
                  ) : length ? (
                    <p><strong>Рекомендуемая длина тренировочной шашки: {length} см.</strong><br />Размер подобран по указанному росту. Обе шашки в комплекте будут одной длины.</p>
                  ) : <p>Для указанного роста рекомендация пока не настроена.</p>}
                  <fieldset>
                    <legend>Способ доставки</legend>
                    {deliveryOptions.filter((option) => !individualSizing || option.provider === "MANUAL").map((option) => (
                      <label className="check" key={option.provider}>
                        <input type="radio" name="deliveryProvider" checked={deliveryProvider === option.provider} onChange={() => { setDeliveryProvider(option.provider); setQuote(undefined); }} />
                        <span><strong>{option.label}</strong><br />{option.description}</span>
                      </label>
                    ))}
                  </fieldset>
                  {deliveryProvider === "MANUAL" ? (
                    <p className="quote">После оформления заявки мы свяжемся с вами, уточним удобный способ доставки и её стоимость. Оплата появится только после согласования.</p>
                  ) : (
                    <fieldset>
                      <legend>Доставка СДЭК</legend>
                      <div className="inline">
                        <input value={cityQuery} onChange={(event) => setCityQuery(event.target.value)} placeholder="Начните вводить город" />
                        <button type="button" className="button-secondary" onClick={searchCity} disabled={loading}>Найти</button>
                      </div>
                      {cities.length > 0 && <div className="city-results">{cities.map((item) => (
                        <button type="button" key={item.code} onClick={() => chooseCity(item)}>{item.city}{item.region ? `, ${item.region}` : ""}</button>
                      ))}</div>}
                      <div className="radio-row">
                        <label><input type="radio" checked={deliveryType === "PICKUP"} onChange={() => setDeliveryType("PICKUP")} /> Пункт выдачи</label>
                        <label><input type="radio" checked={deliveryType === "COURIER"} onChange={() => setDeliveryType("COURIER")} /> Курьер</label>
                      </div>
                      {deliveryType === "PICKUP" ? (
                        <label>Пункт выдачи<select value={pointCode} onChange={(event) => setPointCode(event.target.value)} required>
                          <option value="">Выберите ПВЗ</option>
                          {points.map((point) => <option key={point.code} value={point.code}>{point.address}</option>)}
                        </select></label>
                      ) : <label>Адрес<input value={address} onChange={(event) => setAddress(event.target.value)} required /></label>}
                      <button type="button" className="button-secondary" onClick={calculate} disabled={loading}>Рассчитать доставку</button>
                      {quote && <p className="quote">{quote.tariffName}: <strong>{Number(quote.price).toLocaleString("ru-RU")} ₽</strong></p>}
                    </fieldset>
                  )}
                  <label>Комментарий<textarea name="comment" rows={3} /></label>
                  <label className="check"><input name="privacyAccepted" type="checkbox" required /> Согласен с <Link href="/privacy">политикой конфиденциальности</Link></label>
                  <label className="check"><input name="offerAccepted" type="checkbox" required /> Принимаю <Link href="/offer">публичную оферту</Link></label>
                  {error && <p className="form-error" role="alert">{error}</p>}
                  <button className="button full" disabled={loading || !height || (!length && !individualSizing) || (deliveryProvider === "CDEK" && !quote)}>
                    {loading ? "Проверяем…" : deliveryProvider === "MANUAL" ? "Оформить заявку" : "Перейти к оплате"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
