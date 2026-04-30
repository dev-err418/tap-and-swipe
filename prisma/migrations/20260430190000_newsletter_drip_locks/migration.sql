-- AlterTable
ALTER TABLE "NewsletterSubscriber"
ADD COLUMN     "dripLockedAt" TIMESTAMP(3),
ADD COLUMN     "dripLockedBy" TEXT;

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_dripLockedAt_idx" ON "NewsletterSubscriber"("dripLockedAt");
