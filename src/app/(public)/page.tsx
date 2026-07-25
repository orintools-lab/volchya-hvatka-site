import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db/client";
import { Checkout } from "@/components/public/checkout";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, reviews, faq, content] = await Promise.all([
    db.product.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    }),
    db.review.findMany({
      where: { isVisible: true, showOnHomepage: true },
      orderBy: { sortOrder: "asc" },
      take: 6,
    }),
    db.faqItem.findMany({
      where: { isVisible: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.contentBlock.findMany({ where: { isVisible: true } }),
  ]);
  const contentMap = new Map(content.map((block) => [block.key, block.value]));
  const text = (key: string, fallback: string) => {
    const value = contentMap.get(key);
    return typeof value === "string" ? value : fallback;
  };
  const boolean = (key: string, fallback: boolean) => {
    const value = contentMap.get(key);
    return typeof value === "boolean" ? value : fallback;
  };
  const storedHeroTitle = text(
    "hero.title",
    "Тренировочные шашки\nи видеокурсы\nпо фланкировке",
  );
  const heroTitle = storedHeroTitle ===
    "Тренировочные шашки и видеокурсы по фланкировке"
    ? "Тренировочные шашки\nи видеокурсы\nпо фланкировке"
    : storedHeroTitle;
  const storedHeroSubtitle = text(
    "hero.subtitle",
    "Научитесь управлять шашкой свободно и уверенно. Пошаговые видеоуроки для любого уровня подготовки.",
  );
  const heroSubtitle = storedHeroSubtitle ===
    "Собственное производство. Работаем с 2015 года."
    ? "Научитесь управлять шашкой свободно и уверенно. Пошаговые видеоуроки для любого уровня подготовки."
    : storedHeroSubtitle;
  const serializedProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    subtitle: product.subtitle,
    description: product.description,
    price: product.price.toFixed(2),
    oldPrice: product.oldPrice?.toFixed(2) ?? null,
    composition: product.composition,
    benefits: product.benefits,
    imageUrl: product.imageUrl,
    badge: product.badge,
    category: product.category,
  }));
  const main = serializedProducts.filter((product) => product.category === "MAIN");
  const additional = serializedProducts.filter((product) => product.category === "ADDITIONAL");

  return (
    <>
      <header className="site-header">
        <a href="#top" aria-label="Волчья Хватка — на главную">
          <Image
            className="desktop-logo"
            src="/brand/logo-horizontal.png"
            alt="Волчья Хватка — фланкировка с 2015 года"
            width={1200}
            height={410}
            priority
          />
          <Image
            className="mobile-logo"
            src="/brand/symbol-gold.png"
            alt=""
            width={512}
            height={512}
            priority
          />
        </a>
        <nav aria-label="Основная навигация">
          <a href="#products">Комплекты</a>
          <a href="#video">Видео</a>
          <a href="#reviews">Отзывы</a>
          <a href="#faq">FAQ</a>
          <a href="#contacts">Контакты</a>
        </nav>
        <a className="button button-small" href="#products">Выбрать комплект</a>
      </header>

      <main id="top">
        {boolean("hero.visible", true) && (
          <section className="hero">
            <div className="hero-media">
              <Image
                src={text("hero.imageUrl", "/images/hero-flankirovka.webp")}
                alt={text(
                  "hero.imageAlt",
                  "Фланкировка двумя тренировочными шашками на фоне гор",
                )}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 58vw"
              />
            </div>
            <div className="hero-copy">
              <p className="eyebrow">
                {text("hero.eyebrow", "СОБСТВЕННОЕ ПРОИЗВОДСТВО • С 2015 ГОДА")}
              </p>
              <h1>
                {heroTitle
                  .split("\n")
                  .map((line, index) => (
                    <span key={`${line}-${index}`}>{line}</span>
                  ))}
              </h1>
              <p className="lead">{heroSubtitle}</p>
              <div className="actions">
                <a
                  className="button"
                  href={text("hero.primaryButtonTarget", "#products")}
                >
                  {text("hero.primaryButtonText", "Выбрать комплект")}
                </a>
                <a
                  className="button-secondary"
                  href={text("hero.secondaryButtonTarget", "#video")}
                >
                  {text("hero.secondaryButtonText", "Смотреть видео")}
                </a>
              </div>
            </div>

            <div className="hero-benefits" aria-label="Преимущества">
              {[
                ["◆", "Надёжные материалы", "Отборная древесина и ручная обработка"],
                ["▶", "Пошаговые видеокурсы", "От базовых движений до уверенных связок"],
                ["◎", "Для любого уровня", "Подойдёт новичкам и продолжающим"],
                ["⌖", "Доставка по России", "Расчёт стоимости при оформлении"],
              ].map(([icon, title, description]) => (
                <div key={title}>
                  <span aria-hidden="true">{icon}</span>
                  <p><strong>{title}</strong><small>{description}</small></p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="section-light" id="products">
          <div className="section-heading">
            <p className="eyebrow">Начните с подходящего уровня</p>
            <h2>Два основных комплекта</h2>
          </div>
          <div className="product-grid">
            {main.map((product) => (
              <article className="product-card" key={product.id}>
                {product.badge && <span className="badge">{product.badge}</span>}
                <p className="product-kicker">{product.subtitle}</p>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <ul>
                  {product.composition.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <div className="price">
                  <strong>{Number(product.price).toLocaleString("ru-RU")} ₽</strong>
                  {product.oldPrice && <s>{Number(product.oldPrice).toLocaleString("ru-RU")} ₽</s>}
                </div>
                <Checkout product={product} />
              </article>
            ))}
          </div>
        </section>

        <section className="video-section section-dark" id="video">
          <div>
            <p className="eyebrow">Практика в движении</p>
            <h2>Познакомьтесь с фланкировкой</h2>
            <p className="lead">Основное видео будет загружаться только после вашего действия.</p>
          </div>
          <button className="video-placeholder" type="button" aria-label="Воспроизвести видео">
            <span>▶</span><small>Смотреть видео</small>
          </button>
        </section>

        <section className="section-light">
          <div className="section-heading"><h2>Что входит в комплект</h2></div>
          <div className="feature-grid">
            {[
              ["01", "Две тренировочные шашки", "Сбалансированный комплект для самостоятельной практики."],
              ["02", "Пошаговый видеокурс", "От базовых движений к последовательным связкам."],
              ["03", "Обучение с нуля", "Понятный темп без специальной физической подготовки."],
              ["04", "Занятия где удобно", "Дома, на улице или в тренировочном пространстве."],
            ].map(([icon, title, description]) => (
              <article className="feature-card" key={icon}>
                <span>{icon}</span><h3>{title}</h3><p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-dark" id="reviews">
          <div className="section-heading"><p className="eyebrow">Опыт клиентов</p><h2>Отзывы</h2></div>
          <div className="review-grid">
            {reviews.map((review) => (
              <article className="review-card" key={review.id}>
                <div aria-label={`${review.rating} из 5`}>{"★".repeat(review.rating)}</div>
                <p>«{review.text}»</p>
                <strong>{review.authorName}{review.city ? `, ${review.city}` : ""}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="section-light" id="faq">
          <div className="section-heading"><h2>Частые вопросы</h2></div>
          <div className="faq-list">
            {faq.map((item) => (
              <details key={item.id}><summary>{item.question}</summary><p>{item.answer}</p></details>
            ))}
          </div>
        </section>

        {additional.length > 0 && (
          <section className="section-light additional">
            <div className="section-heading"><h2>Дополнительные товары</h2></div>
            <div className="additional-grid">
              {additional.map((product) => (
                <article key={product.id}><h3>{product.name}</h3><strong>{Number(product.price).toLocaleString("ru-RU")} ₽</strong></article>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer id="contacts">
        <Image src="/brand/logo-white.png" alt="Волчья Хватка" width={640} height={540} />
        <p>Тренировочные шашки и обучение фланкировке с 2015 года.</p>
        <nav aria-label="Юридическая информация">
          <Link href="/privacy">Конфиденциальность</Link>
          <Link href="/offer">Оферта</Link>
          <Link href="/delivery">Доставка</Link>
          <Link href="/payment">Оплата</Link>
          <Link href="/returns">Возврат</Link>
          <Link href="/contacts">Контакты</Link>
        </nav>
      </footer>
    </>
  );
}
