ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';

CREATE TYPE "PaymentType" AS ENUM ('ORDER', 'DELIVERY', 'UPSELL');
CREATE TYPE "CourseDeliveryMode" AS ENUM ('DOWNLOAD_LINK', 'CUSTOMER_CABINET');
CREATE TYPE "DigitalDeliveryStatus" AS ENUM ('PENDING', 'READY', 'SENT', 'OPENED', 'REVOKED', 'EXPIRED');

ALTER TABLE "Order"
ADD COLUMN "agreedDeliveryMethod" TEXT;

ALTER TABLE "Payment"
ADD COLUMN "type" "PaymentType" NOT NULL DEFAULT 'ORDER',
ADD COLUMN "paymentLinkTokenHash" TEXT,
ADD COLUMN "paymentLinkTokenEncrypted" TEXT,
ADD COLUMN "paymentLinkExpiresAt" TIMESTAMP(3),
ADD COLUMN "paidAt" TIMESTAMP(3);

UPDATE "Payment"
SET "type" = CASE
  WHEN "upsellOfferId" IS NOT NULL THEN 'UPSELL'::"PaymentType"
  WHEN "payload"->>'purpose' = 'DELIVERY' THEN 'DELIVERY'::"PaymentType"
  ELSE 'ORDER'::"PaymentType"
END;

CREATE UNIQUE INDEX "Payment_paymentLinkTokenHash_key"
ON "Payment"("paymentLinkTokenHash");

CREATE INDEX "Payment_status_paymentLinkExpiresAt_idx"
ON "Payment"("status", "paymentLinkExpiresAt");

ALTER TABLE "Customer"
ADD COLUMN "vkUserId" TEXT,
ADD COLUMN "vkMessagesAllowedAt" TIMESTAMP(3),
ADD COLUMN "vkLinkSource" TEXT;

CREATE UNIQUE INDEX "Customer_vkUserId_key" ON "Customer"("vkUserId");

ALTER TABLE "Course"
ADD COLUMN "deliveryMode" "CourseDeliveryMode" NOT NULL DEFAULT 'DOWNLOAD_LINK',
ADD COLUMN "sourceUrl" TEXT,
ADD COLUMN "accessDurationDays" INTEGER DEFAULT 365,
ADD COLUMN "autoDeliveryEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "emailTemplate" TEXT;

CREATE TABLE "DigitalDelivery" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "customerEmail" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "tokenEncrypted" TEXT NOT NULL,
  "status" "DigitalDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt" TIMESTAMP(3),
  "firstOpenedAt" TIMESTAMP(3),
  "lastOpenedAt" TIMESTAMP(3),
  "openCount" INTEGER NOT NULL DEFAULT 0,
  "emailSentAt" TIMESTAMP(3),
  "vkSentAt" TIMESTAMP(3),
  "lastEmailError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DigitalDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DigitalDelivery_tokenHash_key" ON "DigitalDelivery"("tokenHash");
CREATE UNIQUE INDEX "DigitalDelivery_orderId_courseId_key" ON "DigitalDelivery"("orderId", "courseId");
CREATE INDEX "DigitalDelivery_status_expiresAt_idx" ON "DigitalDelivery"("status", "expiresAt");
CREATE INDEX "DigitalDelivery_customerEmail_idx" ON "DigitalDelivery"("customerEmail");

ALTER TABLE "DigitalDelivery"
ADD CONSTRAINT "DigitalDelivery_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DigitalDelivery"
ADD CONSTRAINT "DigitalDelivery_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
