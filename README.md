# Волчья Хватка

Самостоятельное Next.js-приложение российского бренда «Волчья Хватка»: публичная
витрина, встроенная административная панель, заказы и подключаемая оплата.

Реализован рабочий сквозной контур: публичная витрина, расчёт доставки СДЭК,
заказ, переход в Робокассу, защищённый ResultURL и административная обработка.

## Требования

- Node.js 22;
- npm 10+;
- Docker с Compose (для PostgreSQL и production-запуска).

## Локальный запуск

1. Установите зависимости:

   ```bash
   npm install
   ```

2. Скопируйте `.env.example` в `.env` и заполните локальные значения. Для базы из
   Docker Compose используйте:

   ```env
   DATABASE_URL=postgresql://volchya:volchya_local@localhost:5432/volchya_hvatka
   ```

3. Запустите PostgreSQL, миграцию, seed и приложение:

   ```bash
   docker compose up -d db
   npx prisma migrate deploy
   npm run db:seed
   npm run dev
   ```

Приложение будет доступно на `http://localhost:3000`, healthcheck — на
`http://localhost:3000/api/health`.

## Проверки

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Production Docker

Сначала задайте безопасный `AUTH_SECRET` и остальные нужные значения окружения,
затем выполните:

```bash
docker compose up -d --build
docker compose run --rm migrate npm run db:seed
```

PostgreSQL в `docker-compose.yml` использует только локальные демонстрационные
данные. Для production измените логин, пароль и строку подключения.

## Переменные окружения

Полный перечень находится в `.env.example`:

- `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`;
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`;
- `PAYMENT_PROVIDER=robokassa`, логин, оба пароля, алгоритм подписи и URL
  Робокассы;
- `CDEK_CLIENT_ID`, `CDEK_CLIENT_SECRET`, API URL, код города отправителя и
  тариф СДЭК;
- каталог и лимит загрузок;
- SMTP и адрес уведомлений;
- идентификаторы Яндекс Метрики и VK Pixel.

Реальные секреты нельзя добавлять в репозиторий.

## Что заполнить перед публикацией

- юридические тексты и реальные реквизиты владельца;
- контакты и ссылки на социальные сети;
- реальные тексты, цены, изображения, видео, отзывы и FAQ;
- параметры доставки и уведомлений;
- безопасные учётные данные администратора;
- production-секреты и, после договора с провайдером, параметры Робокассы;
- credentials договора СДЭК и точный код города отправителя;
- идентификаторы аналитики при необходимости.

Юридические тексты являются техническими шаблонами и должны быть проверены
владельцем сайта и профильным специалистом до публикации.

## Обязательные production URL

В технических настройках Робокассы укажите:

- ResultURL: `https://ВАШ-ДОМЕН/api/payments/robokassa/result`;
- SuccessURL: `https://ВАШ-ДОМЕН/payment/success`;
- FailURL: `https://ВАШ-ДОМЕН/payment/fail`.

ResultURL является единственным основанием для статуса `PAID`. SuccessURL только
показывает уже подтверждённый сервером результат.

Для СДЭК используйте `https://api.cdek.ru/v2` в production и credentials из
действующего договора. Без заполненных credentials форма честно блокирует
непроверенную доставку и оплату.

## Database Deploy через GitHub Actions

1. Откройте GitHub repository → **Settings** → **Secrets and variables** → **Actions**.
2. Добавьте secrets `DATABASE_URL`, `ADMIN_EMAIL` и `ADMIN_PASSWORD`.
3. Если в `prisma/schema.prisma` появится `directUrl`, добавьте также `DIRECT_URL`.
4. Откройте **Actions** → **Database Deploy** → **Run workflow**.

Workflow на Ubuntu устанавливает зависимости, генерирует Prisma Client, применяет
существующие миграции, выполняет настоящий seed и проверяет количества созданных
администраторов, основных товаров, FAQ, отзывов и блоков главной страницы.
