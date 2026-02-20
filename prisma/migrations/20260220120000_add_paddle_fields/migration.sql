-- AlterTable
ALTER TABLE "User" ADD COLUMN "paddleCustomerId" TEXT,
ADD COLUMN "paymentProvider" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_paddleCustomerId_key" ON "User"("paddleCustomerId");

-- CreateIndex
CREATE INDEX "User_paddleCustomerId_idx" ON "User"("paddleCustomerId");

-- Backfill: set paymentProvider for existing Stripe users
UPDATE "User" SET "paymentProvider" = 'stripe' WHERE "stripeCustomerId" IS NOT NULL;
