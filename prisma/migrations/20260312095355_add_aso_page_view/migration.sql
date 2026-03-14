/*
  Warnings:

  - You are about to drop the `AsoLicense` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "AsoLicense";

-- CreateTable
CREATE TABLE "AsoPageView" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AsoPageView_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AsoPageView_type_createdAt_idx" ON "AsoPageView"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AsoPageView_sessionId_type_key" ON "AsoPageView"("sessionId", "type");
