ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'AWAITING_SIZE_AGREEMENT';

ALTER TABLE "LengthRule"
  ALTER COLUMN "maxHeightCm" DROP NOT NULL;

ALTER TABLE "LengthRule"
  DROP CONSTRAINT IF EXISTS "LengthRule_height_check",
  ADD CONSTRAINT "LengthRule_height_check"
    CHECK ("maxHeightCm" IS NULL OR "minHeightCm" <= "maxHeightCm");
