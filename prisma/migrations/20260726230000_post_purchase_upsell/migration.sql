CREATE TYPE "UpsellOfferStatus" AS ENUM ('ACTIVE', 'ACCEPTED', 'EXPIRED');

ALTER TABLE "Payment"
  ALTER COLUMN "orderId" DROP NOT NULL,
  ADD COLUMN "upsellOfferId" TEXT;

CREATE TABLE "UpsellSettings" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "regularPrice" DECIMAL(12,2) NOT NULL DEFAULT 3390,
  "specialPrice" DECIMAL(12,2) NOT NULL DEFAULT 2000,
  "durationMinutes" INTEGER NOT NULL DEFAULT 5,
  "videoUrl" TEXT,
  "title" TEXT NOT NULL DEFAULT 'Специальное предложение только для новых учеников',
  "text" TEXT NOT NULL DEFAULT 'Пока вы находитесь на этой странице, вы можете получить полный курс «Мастер»',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UpsellSettings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UpsellSettings_duration_check" CHECK ("durationMinutes" > 0),
  CONSTRAINT "UpsellSettings_prices_check" CHECK ("regularPrice" > 0 AND "specialPrice" > 0)
);

CREATE TABLE "UpsellOffer" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "status" "UpsellOfferStatus" NOT NULL DEFAULT 'ACTIVE',
  "regularPrice" DECIMAL(12,2) NOT NULL,
  "specialPrice" DECIMAL(12,2) NOT NULL,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "clickCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UpsellOffer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UpsellOffer_orderId_key" ON "UpsellOffer"("orderId");
CREATE INDEX "UpsellOffer_status_expiresAt_idx" ON "UpsellOffer"("status", "expiresAt");
CREATE UNIQUE INDEX "Payment_upsellOfferId_key" ON "Payment"("upsellOfferId");

ALTER TABLE "UpsellOffer"
  ADD CONSTRAINT "UpsellOffer_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_upsellOfferId_fkey"
  FOREIGN KEY ("upsellOfferId") REFERENCES "UpsellOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
