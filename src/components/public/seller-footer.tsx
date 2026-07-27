import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { SellerDetails } from "../../server/services/seller-details-policy";
import { sellerDetailLines } from "../../server/services/seller-details-policy";

export function SellerFooter({ details }: { details: Partial<SellerDetails> }) {
  const lines = sellerDetailLines(details);
  return <footer id="contacts">
    <Image src="/brand/logo-white.png" alt="Волчья Хватка" width={640} height={540} />
    <div>
      <p>Тренировочные шашки и обучение фланкировке с 2015 года.</p>
      {lines.length > 0 && <div className="seller-summary">{lines.map((line) => <p key={line}>{line}</p>)}</div>}
    </div>
    <nav aria-label="Юридическая информация">
      <Link href="/seller-details">Реквизиты продавца</Link>
      <Link href="/privacy">Политика конфиденциальности</Link>
      <Link href="/offer">Публичная оферта</Link>
      <Link href="/delivery">Доставка и оплата</Link>
      <Link href="/returns">Возврат и обмен</Link>
    </nav>
  </footer>;
}
