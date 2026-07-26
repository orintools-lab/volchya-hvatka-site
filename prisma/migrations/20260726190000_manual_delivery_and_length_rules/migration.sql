ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'AWAITING_DELIVERY_AGREEMENT';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'NOT_CREATED' BEFORE 'PENDING';
ALTER TYPE "DeliveryMethod" ADD VALUE IF NOT EXISTS 'OZON';
ALTER TYPE "DeliveryMethod" ADD VALUE IF NOT EXISTS 'MANUAL';

CREATE TYPE "DeliveryAgreementStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'AGREED');

ALTER TABLE "Order"
  ALTER COLUMN "city" DROP NOT NULL,
  ALTER COLUMN "deliveryType" DROP NOT NULL,
  ALTER COLUMN "cdekCityCode" DROP NOT NULL,
  ALTER COLUMN "cdekTariffCode" DROP NOT NULL,
  ALTER COLUMN "cdekTariffName" DROP NOT NULL,
  ALTER COLUMN "deliveryQuoteId" DROP NOT NULL,
  ALTER COLUMN "deliveryQuotedAt" DROP NOT NULL,
  ALTER COLUMN "deliveryPrice" DROP NOT NULL,
  ALTER COLUMN "deliveryPrice" DROP DEFAULT,
  ALTER COLUMN "total" DROP NOT NULL,
  ADD COLUMN "recommendedLengthCm" INTEGER,
  ADD COLUMN "actualLengthCm" INTEGER,
  ADD COLUMN "secondActualLengthCm" INTEGER,
  ADD COLUMN "shashkaCount" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "material" TEXT NOT NULL DEFAULT 'Берёзовая фанера',
  ADD COLUMN "deliveryAgreementStatus" "DeliveryAgreementStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN "agreedDeliveryPrice" DECIMAL(12,2),
  ADD COLUMN "deliveryComment" TEXT,
  ADD COLUMN "deliveryAgreedAt" TIMESTAMP(3);

ALTER TABLE "OrderItem"
  ADD COLUMN "recommendedLengthCm" INTEGER,
  ADD COLUMN "actualLengthCm" INTEGER,
  ADD COLUMN "secondActualLengthCm" INTEGER,
  ADD COLUMN "shashkaCount" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "material" TEXT NOT NULL DEFAULT 'Берёзовая фанера';

ALTER TABLE "DeliveryQuote"
  ADD COLUMN "provider" "DeliveryMethod" NOT NULL DEFAULT 'CDEK';

CREATE TABLE "DeliveryProviderConfig" (
  "provider" "DeliveryMethod" NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT false,
  "label" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryProviderConfig_pkey" PRIMARY KEY ("provider")
);

CREATE TABLE "LengthRule" (
  "id" TEXT NOT NULL,
  "minHeightCm" INTEGER NOT NULL,
  "maxHeightCm" INTEGER NOT NULL,
  "lengthCm" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LengthRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LengthRule_height_check" CHECK ("minHeightCm" <= "maxHeightCm"),
  CONSTRAINT "LengthRule_length_check" CHECK ("lengthCm" > 0)
);

CREATE INDEX "LengthRule_isActive_minHeightCm_maxHeightCm_idx"
  ON "LengthRule"("isActive", "minHeightCm", "maxHeightCm");
