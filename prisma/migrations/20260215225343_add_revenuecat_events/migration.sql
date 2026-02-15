-- CreateTable
CREATE TABLE "RevenueCatEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "appName" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "periodType" TEXT,
    "productId" TEXT,
    "appUserId" TEXT,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "store" TEXT,
    "environment" TEXT NOT NULL DEFAULT 'PRODUCTION',
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RevenueCatEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrialDiscordMessage" (
    "id" TEXT NOT NULL,
    "appName" TEXT NOT NULL,
    "appUserId" TEXT NOT NULL,
    "originalTransactionId" TEXT NOT NULL,
    "discordMessageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrialDiscordMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RevenueCatEvent_eventId_key" ON "RevenueCatEvent"("eventId");

-- CreateIndex
CREATE INDEX "RevenueCatEvent_appName_createdAt_idx" ON "RevenueCatEvent"("appName", "createdAt");

-- CreateIndex
CREATE INDEX "RevenueCatEvent_eventType_periodType_createdAt_idx" ON "RevenueCatEvent"("eventType", "periodType", "createdAt");

-- CreateIndex
CREATE INDEX "TrialDiscordMessage_appUserId_idx" ON "TrialDiscordMessage"("appUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TrialDiscordMessage_appName_originalTransactionId_key" ON "TrialDiscordMessage"("appName", "originalTransactionId");
