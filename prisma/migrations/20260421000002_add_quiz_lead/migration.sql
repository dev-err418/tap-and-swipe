-- CreateTable
CREATE TABLE "QuizLead" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "hasApp" TEXT NOT NULL,
    "challenge" TEXT,
    "budget" TEXT,
    "route" TEXT NOT NULL,
    "ref" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizLead_email_idx" ON "QuizLead"("email");

-- CreateIndex
CREATE INDEX "QuizLead_route_createdAt_idx" ON "QuizLead"("route", "createdAt");
