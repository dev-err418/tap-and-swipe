CREATE TABLE "AnalyticsExperiment" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnalyticsExperiment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AnalyticsExperiment_appId_createdAt_idx" ON "AnalyticsExperiment"("appId", "createdAt");
