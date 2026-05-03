-- AlterTable
ALTER TABLE "User" ADD COLUMN "whopMembershipId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_whopMembershipId_key" ON "User"("whopMembershipId");
