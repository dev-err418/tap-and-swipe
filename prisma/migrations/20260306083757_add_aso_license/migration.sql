-- CreateTable
CREATE TABLE "AsoLicense" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "email" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "AsoLicense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AsoLicense_key_key" ON "AsoLicense"("key");

-- CreateIndex
CREATE INDEX "AsoLicense_key_idx" ON "AsoLicense"("key");

-- CreateIndex
CREATE INDEX "AsoLicense_email_idx" ON "AsoLicense"("email");
