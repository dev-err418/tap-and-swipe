-- CreateTable
CREATE TABLE "PlatformAccount" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "accountId" TEXT,
    "accountName" TEXT,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "rawMetadata" JSONB,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledPost" (
    "id" TEXT NOT NULL,
    "platforms" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "publishAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "caption" TEXT,
    "tags" TEXT[],
    "videoR2Key" TEXT,
    "youtubeVideoId" TEXT,
    "youtubeUrl" TEXT,
    "instagramMediaId" TEXT,
    "instagramUrl" TEXT,
    "lastError" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAccount_platform_key" ON "PlatformAccount"("platform");

-- CreateIndex
CREATE INDEX "ScheduledPost_status_publishAt_idx" ON "ScheduledPost"("status", "publishAt");

-- CreateIndex
CREATE INDEX "ScheduledPost_publishAt_idx" ON "ScheduledPost"("publishAt");

