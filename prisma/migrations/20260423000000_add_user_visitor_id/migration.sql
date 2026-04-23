-- AlterTable
ALTER TABLE "User" ADD COLUMN "visitorId" TEXT;

-- CreateIndex
CREATE INDEX "User_visitorId_idx" ON "User"("visitorId");
