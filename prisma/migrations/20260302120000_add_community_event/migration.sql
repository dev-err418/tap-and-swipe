-- CreateTable
CREATE TABLE "CommunityEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityEvent_sessionId_type_key" ON "CommunityEvent"("sessionId", "type");

-- CreateIndex
CREATE INDEX "CommunityEvent_type_createdAt_idx" ON "CommunityEvent"("type", "createdAt");
