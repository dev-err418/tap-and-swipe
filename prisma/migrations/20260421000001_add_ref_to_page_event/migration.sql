-- AlterTable
ALTER TABLE "PageEvent" ADD COLUMN "ref" TEXT;

-- CreateIndex
CREATE INDEX "PageEvent_ref_createdAt_idx" ON "PageEvent"("ref", "createdAt");
