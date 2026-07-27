"use client";

import { useState } from "react";
import { agreeManualDelivery } from "@/app/admin/actions";

export function AgreementPaymentForm({
  orderId,
  subtotal,
  actualLengthCm,
  alreadyPaid,
}: {
  orderId: string;
  subtotal: string;
  actualLengthCm: number | null;
  alreadyPaid: boolean;
}) {
  const [deliveryPrice, setDeliveryPrice] = useState("0");
  const products = Number(subtotal);
  const delivery = Number(deliveryPrice) || 0;

  return <form action={agreeManualDelivery} className="admin-panel admin-form">
    <h2>Оплата заказа</h2>
    <p>Согласуйте доставку и создайте защищённую ссылку на оплату.</p>
    <input type="hidden" name="id" value={orderId} />
    <label>Фактическая длина каждой шашки, см
      <input name="actualLengthCm" type="number" min="1" defaultValue={actualLengthCm ?? ""} required />
    </label>
    <label>Стоимость доставки, ₽
      <input
        name="deliveryPrice"
        type="number"
        min="0"
        step="0.01"
        required
        value={deliveryPrice}
        onChange={(event) => setDeliveryPrice(event.target.value)}
      />
    </label>
    <label>Способ доставки
      <input name="deliveryMethod" required placeholder="Например: СДЭК до ПВЗ" />
    </label>
    <label>Комментарий администратора
      <textarea name="deliveryComment" rows={3} />
    </label>
    <div className="quote">
      <p>Товары: <strong>{products.toFixed(2)} ₽</strong></p>
      <p>Доставка: <strong>{delivery.toFixed(2)} ₽</strong></p>
      <p>{alreadyPaid ? "Отдельный платёж за доставку" : "Итого к оплате"}: <strong>{(alreadyPaid ? delivery : products + delivery).toFixed(2)} ₽</strong></p>
    </div>
    <button className="button">Согласовать доставку и создать ссылку на оплату</button>
  </form>;
}
