import { PrismaClient, ProductCategory } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    await prisma.adminUser.upsert({
      where: { email: adminEmail },
      update: { passwordHash: await hashPassword(adminPassword), isActive: true },
      create: {
        email: adminEmail,
        passwordHash: await hashPassword(adminPassword),
        name: "Администратор",
      },
    });
  } else {
    console.warn("ADMIN_EMAIL/ADMIN_PASSWORD не заданы — администратор не создан.");
  }

  await prisma.product.upsert({
    where: { slug: "start" },
    update: {},
    create: {
      slug: "start",
      category: ProductCategory.MAIN,
      name: "Комплект «Старт»",
      subtitle: "Тренировочные шашки и базовый курс",
      description: "Две тренировочные шашки и пошаговый базовый видеокурс.",
      price: 4990,
      oldPrice: 5990,
      composition: ["2 тренировочные шашки", "Базовый видеокурс", "Доступ после оплаты"],
      benefits: ["Обучение с нуля", "Занятия дома или на улице"],
      badge: "Самый популярный",
      sortOrder: 10,
      weightGrams: 1200,
      lengthCm: 32,
      widthCm: 22,
      heightCm: 12,
      packageCount: 1,
    },
  });

  await prisma.product.upsert({
    where: { slug: "master" },
    update: {},
    create: {
      slug: "master",
      category: ProductCategory.MAIN,
      name: "Комплект «Мастер»",
      subtitle: "Тренировочные шашки и полный курс",
      description: "Две тренировочные шашки и полный курс «Мастер».",
      price: 7990,
      oldPrice: 8990,
      composition: ["2 тренировочные шашки", "Полный курс «Мастер»", "Доступ после оплаты"],
      benefits: ["Базовые и продвинутые элементы", "Последовательная программа"],
      sortOrder: 20,
      weightGrams: 1200,
      lengthCm: 32,
      widthCm: 22,
      heightCm: 12,
      packageCount: 1,
    },
  });

  const content = [
    {
      key: "hero.eyebrow",
      section: "hero",
      label: "Надзаголовок первого экрана",
      value: "СОБСТВЕННОЕ ПРОИЗВОДСТВО • С 2015 ГОДА",
      sortOrder: 5,
    },
    {
      key: "hero.title",
      section: "hero",
      label: "Заголовок первого экрана",
      value: "Тренировочные шашки\nи видеокурсы\nпо фланкировке",
      sortOrder: 10,
    },
    {
      key: "hero.subtitle",
      section: "hero",
      label: "Подзаголовок первого экрана",
      value: "Научитесь управлять шашкой свободно и уверенно. Пошаговые видеоуроки для любого уровня подготовки.",
      sortOrder: 20,
    },
    {
      key: "hero.primaryButtonText",
      section: "hero",
      label: "Текст основной кнопки",
      value: "Выбрать комплект",
      sortOrder: 30,
    },
    {
      key: "hero.primaryButtonTarget",
      section: "hero",
      label: "Ссылка основной кнопки",
      value: "#products",
      sortOrder: 40,
    },
    {
      key: "hero.secondaryButtonText",
      section: "hero",
      label: "Текст второй кнопки",
      value: "Смотреть видео",
      sortOrder: 50,
    },
    {
      key: "hero.secondaryButtonTarget",
      section: "hero",
      label: "Ссылка второй кнопки",
      value: "#video",
      sortOrder: 60,
    },
    {
      key: "hero.imageUrl",
      section: "hero",
      label: "URL изображения",
      value: "/images/hero-flankirovka.webp",
      sortOrder: 70,
    },
    {
      key: "hero.imageAlt",
      section: "hero",
      label: "Alt изображения",
      value: "Фланкировка двумя тренировочными шашками на фоне гор",
      sortOrder: 80,
    },
    {
      key: "hero.visible",
      section: "hero",
      label: "Показывать первый экран",
      value: true,
      sortOrder: 90,
    },
    {
      key: "video.main",
      section: "video",
      label: "Основное видео",
      kind: "VIDEO" as const,
      value: {
        title: "Познакомьтесь с тренировочными шашками",
        description: "Ссылка и обложка заполняются владельцем сайта.",
        url: "",
        coverUrl: "",
      },
      sortOrder: 10,
    },
  ];

  for (const block of content) {
    await prisma.contentBlock.upsert({
      where: { key: block.key },
      update: block,
      create: block,
    });
  }

  const settings = [
    { key: "brand.name", label: "Название бренда", value: "Волчья Хватка" },
    { key: "brand.tagline", label: "Подпись бренда", value: "Фланкировка с 2015 года" },
    { key: "contacts", label: "Контакты", value: { phone: "", email: "", vk: "" } },
    {
      key: "legal.requisites",
      label: "Реквизиты",
      value: { owner: "", inn: "", address: "" },
    },
  ];

  for (const setting of settings) {
    await prisma.siteSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  const faq = [
    ["Безопасны ли тренировочные шашки?", "Они предназначены для последовательной тренировочной практики. Соблюдайте дистанцию и рекомендации курса."],
    ["С какого возраста можно заниматься?", "Подросткам рекомендуется заниматься с учётом роста, координации и под контролем взрослого."],
    ["Как подобрать размер?", "Выберите возрастной вариант или укажите рост — мы поможем подобрать размер."],
    ["Когда открывается доступ к курсу?", "Доступ предоставляется после подтверждённой оплаты."],
  ];
  for (const [index, item] of faq.entries()) {
    const existing = await prisma.faqItem.findFirst({ where: { question: item[0] } });
    if (!existing) await prisma.faqItem.create({ data: { question: item[0], answer: item[1], sortOrder: index * 10 } });
  }

  const reviews = [
    ["Алексей", "Москва", "Понятный курс и удобные тренировочные шашки. Начал с базовых движений и постепенно собрал связки."],
    ["Марина", "Казань", "Понравилась спокойная подача и возможность заниматься в своём темпе."],
    ["Игорь", "Самара", "Комплект пришёл аккуратно упакованным, уроки помогают выстроить последовательную практику."],
    ["Дмитрий", "Тула", "Хороший способ развивать координацию и переключаться после рабочего дня."],
  ];
  for (const [index, item] of reviews.entries()) {
    const existing = await prisma.review.findFirst({ where: { authorName: item[0], text: item[2] } });
    if (!existing) await prisma.review.create({ data: {
      authorName:item[0], city:item[1], text:item[2], rating:5, showOnHomepage:true, sortOrder:index*10,
    } });
  }

  const legalPages = [
    ["privacy", "Политика конфиденциальности"],
    ["offer", "Публичная оферта"],
    ["delivery", "Оплата и доставка"],
    ["payment", "Условия оплаты"],
    ["returns", "Гарантия и возврат"],
    ["contacts", "Контакты"],
  ];
  for (const [key, title] of legalPages) {
    await prisma.contentBlock.upsert({
      where: { key: `legal.${key}` },
      update: {},
      create: {
        key: `legal.${key}`, section: "legal", label: title, kind: "RICH_TEXT",
        value: { title, body: "Текст должен быть заполнен и проверен владельцем сайта до публикации." },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
