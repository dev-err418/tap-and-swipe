-- CreateTable
CREATE TABLE "QuizLead" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL DEFAULT '+33',
    "profileType" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizLead_email_idx" ON "QuizLead"("email");

-- CreateIndex
CREATE INDEX "QuizLead_profileType_idx" ON "QuizLead"("profileType");

-- CreateIndex
CREATE INDEX "QuizLead_createdAt_idx" ON "QuizLead"("createdAt");
