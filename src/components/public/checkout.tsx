"use client";

import { useState } from "react";
import Link from "next/link";

type Product = {
  id: string;
  name: string;
  price: string;
};
type City = { code: number; city: string; region?: string };
type Point = { code: string; name: string; address: string };

export function Checkout({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [city, setCity] = useState<City>();
  const [points, setPoints] = useState<Point[]>([]);
  const [deliveryType, setDeliveryType] = useState<"PICKUP" | "COURIER">("PICKUP");
  const [pointCode, setPointCode] = useState("");
  const [address, setAddress] = useState("");
  const [quote, setQuote] = useState<{ id: string; price: string; tariffName: string }>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function searchCity() {
    setLoading(true); setError("");
    const response = await fetch(`/api/delivery/cities?q=${encodeURIComponent(cityQuery)}`);
    const data = await response.json();
    if (!response.ok) setError(data.error);
    else setCities(data);
    setLoading(false);
  }

  async function chooseCity(selected: City) {
    setCity(selected); setCities([]); setCityQuery(selected.city); setQuote(undefined);
    if (deliveryType === "PICKUP") {
      const response = await fetch(`/api/delivery/points?cityCode=${selected.code}`);
      const data = await response.json();
      if (!response.ok) setError(data.error); else setPoints(data);
    }
  }

  async function calculate() {
    if (!city) return setError("Сначала выберите город из найденного списка.");
    setLoading(true); setError("");
    const response = await fetch("/api/delivery/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId: product.id, quantity: 1, cityCode: city.code, cityName: city.city,
        deliveryType, pointCode: pointCode || undefined, address: address || undefined,
      }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error); else setQuote(data);
    setLoading(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quote) return setError("Рассчитайте и подтвердите доставку.");
    setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        quoteId: quote.id,
        customerName: form.get("customerName"),
        phone: form.get("phone"),
        email: form.get("email"),
        postalCode: form.get("postalCode") || undefined,
        shashkaSize: form.get("shashkaSize"),
        customerHeight: form.get("customerHeight") ? Number(form.get("customerHeight")) : undefined,
        comment: form.get("comment") || undefined,
        privacyAccepted: form.get("privacyAccepted") === "on",
        offerAccepted: form.get("offerAccepted") === "on",
      }),
    });
    const data = await response.json();
    if (!response.ok) setError(data.error);
    else window.location.assign(data.paymentUrl);
    setLoading(false);
  }

  return (
    <>
      <button className="button full" type="button" onClick={() => setOpen(true)}>
        Купить комплект
      </button>
      {open && (
        <div className="modal-backdrop" role="presentation">
          <div className="order-modal" role="dialog" aria-modal="true" aria-labelledby={`order-${product.id}`}>
            <button className="close" type="button" onClick={() => setOpen(false)} aria-label="Закрыть">×</button>
            <h2 id={`order-${product.id}`}>Оформление заказа</h2>
            <p><strong>{product.name}</strong> · {Number(product.price).toLocaleString("ru-RU")} ₽</p>
            <form onSubmit={submit}>
              <div className="form-grid">
                <label>ФИО<input name="customerName" required minLength={3} /></label>
                <label>Телефон<input name="phone" type="tel" required /></label>
                <label>Email<input name="email" type="email" required /></label>
                <label>Размер шашки<select name="shashkaSize" required>
                  <option value="ADULT">Взрослая</option>
                  <option value="TEEN">Подростковая</option>
                  <option value="CHILD">Детская</option>
                  <option value="BY_HEIGHT">Подобрать по росту</option>
                </select></label>
                <label>Рост, если нужен подбор<input name="customerHeight" type="number" min="80" max="230" /></label>
                <label>Почтовый индекс<input name="postalCode" /></label>
              </div>
              <fieldset>
                <legend>Доставка СДЭК</legend>
                <div className="inline">
                  <input value={cityQuery} onChange={(event) => setCityQuery(event.target.value)} placeholder="Начните вводить город" />
                  <button type="button" className="button-secondary" onClick={searchCity} disabled={loading}>Найти</button>
                </div>
                {cities.length > 0 && <div className="city-results">{cities.map((item) => (
                  <button type="button" key={item.code} onClick={() => chooseCity(item)}>
                    {item.city}{item.region ? `, ${item.region}` : ""}
                  </button>
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
              <label>Комментарий<textarea name="comment" rows={3} /></label>
              <label className="check"><input name="privacyAccepted" type="checkbox" required /> Согласен с <Link href="/privacy">политикой конфиденциальности</Link></label>
              <label className="check"><input name="offerAccepted" type="checkbox" required /> Принимаю <Link href="/offer">публичную оферту</Link></label>
              {quote && <div className="order-total">
                <span>Товары: {Number(product.price).toLocaleString("ru-RU")} ₽</span>
                <span>Доставка: {Number(quote.price).toLocaleString("ru-RU")} ₽</span>
                <strong>Итого: {(Number(product.price) + Number(quote.price)).toLocaleString("ru-RU")} ₽</strong>
              </div>}
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="button full" disabled={loading || !quote}>{loading ? "Проверяем…" : "Перейти к оплате"}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
