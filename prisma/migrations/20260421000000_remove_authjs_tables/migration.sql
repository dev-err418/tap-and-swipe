-- Remove Auth.js tables and fields (switching to Discord-only auth)
DROP TABLE IF EXISTS "VerificationToken";
DROP TABLE IF EXISTS "Session";
DROP TABLE IF EXISTS "Account";
ALTER TABLE "User" DROP COLUMN IF EXISTS "emailVerified";
