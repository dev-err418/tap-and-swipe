-- CreateTable
CREATE TABLE "PageEvent" (
    "id" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "country" TEXT,
    "referrer" TEXT,
    "stripeCustomerId" TEXT,
    "revenue" INTEGER,
    "currency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageEvent_pkey" PRIMARY KEY ("id")
);

-- Migrate CommunityEvent data into PageEvent
INSERT INTO "PageEvent" ("id", "product", "type", "visitorId", "sessionId", "createdAt")
SELECT "id", 'community', "type", "sessionId", "sessionId", "createdAt"
FROM "CommunityEvent";

-- CreateIndex
CREATE UNIQUE INDEX "PageEvent_sessionId_type_product_key" ON "PageEvent"("sessionId", "type", "product");

-- CreateIndex
CREATE INDEX "PageEvent_product_type_createdAt_idx" ON "PageEvent"("product", "type", "createdAt");

-- CreateIndex
CREATE INDEX "PageEvent_visitorId_idx" ON "PageEvent"("visitorId");

-- CreateIndex
CREATE INDEX "PageEvent_product_country_createdAt_idx" ON "PageEvent"("product", "country", "createdAt");

-- DropTable
DROP TABLE "AsoPageView";

-- DropTable
DROP TABLE "CommunityEvent";

-- AlterTable: drop variant from QuizEvent
ALTER TABLE "QuizEvent" DROP COLUMN "variant";

-- AlterTable: drop variant from QuizLead
ALTER TABLE "QuizLead" DROP COLUMN "variant";
