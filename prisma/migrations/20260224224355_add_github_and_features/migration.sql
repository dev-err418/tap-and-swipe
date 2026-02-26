-- AlterTable
ALTER TABLE "User" ADD COLUMN "githubId" TEXT,
ADD COLUMN "githubUsername" TEXT,
ADD COLUMN "githubConnectedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- AlterTable
ALTER TABLE "Video" ADD COLUMN "sectionType" TEXT,
ADD COLUMN "featureTag" TEXT;

-- CreateTable
CREATE TABLE "FeatureSelection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeatureSelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeatureSelection_userId_idx" ON "FeatureSelection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureSelection_userId_featureId_key" ON "FeatureSelection"("userId", "featureId");

-- AddForeignKey
ALTER TABLE "FeatureSelection" ADD CONSTRAINT "FeatureSelection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
