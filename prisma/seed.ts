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
    update: {
      description: "Тренировочные шашки из берёзовой фанеры. Каждая шашка тщательно обрабатывается и шлифуется вручную. В комплект входит пошаговый базовый видеокурс.",
      composition: ["2 тренировочные шашки из берёзовой фанеры", "Базовый видеокурс", "Доступ после оплаты"],
    },
    create: {
      slug: "start",
      category: ProductCategory.MAIN,
      name: "Комплект «Старт»",
      subtitle: "Тренировочные шашки и базовый курс",
      description: "Тренировочные шашки из берёзовой фанеры. Каждая шашка тщательно обрабатывается и шлифуется вручную. В комплект входит пошаговый базовый видеокурс.",
      price: 4990,
      oldPrice: 5990,
      composition: ["2 тренировочные шашки из берёзовой фанеры", "Базовый видеокурс", "Доступ после оплаты"],
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
    update: {
      description: "Тренировочные шашки из берёзовой фанеры. Каждая шашка тщательно обрабатывается и шлифуется вручную. В комплект входит полный курс «Мастер».",
      composition: ["2 тренировочные шашки из берёзовой фанеры", "Полный курс «Мастер»", "Доступ после оплаты"],
    },
    create: {
      slug: "master",
      category: ProductCategory.MAIN,
      name: "Комплект «Мастер»",
      subtitle: "Тренировочные шашки и полный курс",
      description: "Тренировочные шашки из берёзовой фанеры. Каждая шашка тщательно обрабатывается и шлифуется вручную. В комплект входит полный курс «Мастер».",
      price: 7990,
      oldPrice: 8990,
      composition: ["2 тренировочные шашки из берёзовой фанеры", "Полный курс «Мастер»", "Доступ после оплаты"],
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

  const deliveryProviders = [
    {
      provider: "CDEK" as const,
      isEnabled: true,
      label: "СДЭК",
      description: "Доставка в пункт выдачи или курьером после расчёта.",
    },
    {
      provider: "OZON" as const,
      isEnabled: false,
      label: "Ozon",
      description: "Интеграция не подключена.",
    },
    {
      provider: "MANUAL" as const,
      isEnabled: true,
      label: "Доставка по согласованию",
      description: "После оформления заказа мы свяжемся с вами, уточним удобный способ доставки и её стоимость.",
    },
  ];
  for (const provider of deliveryProviders) {
    await prisma.deliveryProviderConfig.upsert({
      where: { provider: provider.provider },
      update: {
        label: provider.label,
        description: provider.description,
      },
      create: provider,
    });
  }

  const lengthRules = [
    { minHeightCm: 100, maxHeightCm: 109, lengthCm: 55, label: "Рост 100–109 см", sortOrder: 10 },
    { minHeightCm: 110, maxHeightCm: 119, lengthCm: 65, label: "Рост 110–119 см", sortOrder: 20 },
    { minHeightCm: 120, maxHeightCm: 139, lengthCm: 76, label: "Рост 120–139 см", sortOrder: 30 },
    { minHeightCm: 140, maxHeightCm: 154, lengthCm: 82, label: "Рост 140–154 см", sortOrder: 40 },
    { minHeightCm: 155, maxHeightCm: 169, lengthCm: 86, label: "Рост 155–169 см", sortOrder: 50 },
    { minHeightCm: 170, maxHeightCm: null, lengthCm: 90, label: "Рост от 170 см", sortOrder: 60 },
  ];
  await prisma.lengthRule.updateMany({ data: { isActive: false } });
  for (const rule of lengthRules) {
    const existing = await prisma.lengthRule.findFirst({ where: { label: rule.label } });
    if (existing) {
      await prisma.lengthRule.update({ where: { id: existing.id }, data: { ...rule, isActive: true } });
    } else {
      await prisma.lengthRule.create({ data: rule });
    }
  }

  const faq = [
    ["Безопасны ли тренировочные шашки?", "Они предназначены для последовательной тренировочной практики. Соблюдайте дистанцию и рекомендации курса."],
    ["С какого возраста можно заниматься?", "Подросткам рекомендуется заниматься с учётом роста, координации и под контролем взрослого."],
    ["Как подобрать размер?", "Укажите рост при оформлении заказа — система предложит настроенную длину, а при необходимости менеджер уточнит её лично."],
    ["Когда открывается доступ к курсу?", "Доступ предоставляется после подтверждённой оплаты."],
  ];
  for (const [index, item] of faq.entries()) {
    const existing = await prisma.faqItem.findFirst({ where: { question: item[0] } });
    if (existing) {
      await prisma.faqItem.update({ where: { id: existing.id }, data: { answer: item[1], sortOrder: index * 10 } });
    } else {
      await prisma.faqItem.create({ data: { question: item[0], answer: item[1], sortOrder: index * 10 } });
    }
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
