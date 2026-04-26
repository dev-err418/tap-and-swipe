-- Drop Paddle integration: column + indexes on User.
-- Subscriptions are all on Whop; column had 0 non-null rows at drop time.

DROP INDEX IF EXISTS "User_paddleCustomerId_key";
DROP INDEX IF EXISTS "User_paddleCustomerId_idx";
ALTER TABLE "User" DROP COLUMN IF EXISTS "paddleCustomerId";
