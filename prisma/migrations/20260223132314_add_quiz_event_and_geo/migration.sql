-- AlterTable
ALTER TABLE "QuizLead" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT;

-- CreateTable
CREATE TABLE "QuizEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizEvent_type_createdAt_idx" ON "QuizEvent"("type", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuizEvent_sessionId_type_key" ON "QuizEvent"("sessionId", "type");
