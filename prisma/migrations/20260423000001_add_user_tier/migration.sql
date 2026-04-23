-- Add tier column to User for Starter vs full community differentiation.
ALTER TABLE "User" ADD COLUMN "tier" TEXT;

-- Backfill all existing users as "full" tier (they all signed up before starter existed).
UPDATE "User" SET "tier" = 'full';
