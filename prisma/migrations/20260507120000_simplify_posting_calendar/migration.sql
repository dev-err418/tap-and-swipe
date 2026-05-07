-- Drop PlatformAccount (no auto-publish, no OAuth needed)
DROP TABLE IF EXISTS "PlatformAccount";

-- Drop indexes that reference soon-to-be-removed columns
DROP INDEX IF EXISTS "ScheduledPost_status_publishAt_idx";

-- Slim ScheduledPost down to a calendar entry (keep notifiedAt for the reminder cron)
ALTER TABLE "ScheduledPost"
  DROP COLUMN IF EXISTS "status",
  DROP COLUMN IF EXISTS "caption",
  DROP COLUMN IF EXISTS "tags",
  DROP COLUMN IF EXISTS "videoR2Key",
  DROP COLUMN IF EXISTS "youtubeVideoId",
  DROP COLUMN IF EXISTS "youtubeUrl",
  DROP COLUMN IF EXISTS "instagramMediaId",
  DROP COLUMN IF EXISTS "instagramUrl",
  DROP COLUMN IF EXISTS "lastError",
  DROP COLUMN IF EXISTS "publishedAt";

-- Index notifiedAt so the reminder cron's "WHERE notifiedAt IS NULL" stays fast
CREATE INDEX IF NOT EXISTS "ScheduledPost_notifiedAt_idx" ON "ScheduledPost"("notifiedAt");
