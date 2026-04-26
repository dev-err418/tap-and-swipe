/**
 * Data Migration Script: Legacy DB → Clean DB
 *
 * This script migrates data from the old database (with legacy table names)
 * to a fresh database with the new clean schema.
 *
 * Prerequisites:
 *   1. Create a fresh PostgreSQL database (e.g. `tap_and_swipe_v2`)
 *   2. Set NEW_DATABASE_URL in .env pointing to the new DB
 *   3. Run `npx prisma migrate deploy` against the new DB
 *   4. Run this script: `npx tsx scripts/migrate-to-clean-db.ts`
 *
 * The script will:
 *   - Copy Users (preserving IDs)
 *   - Copy Lessons from old "Video" table to new "Lesson" table
 *   - Copy LessonProgress from old "VideoProgress" table
 *   - Transform PremiumUser (discordId → userId)
 *   - Copy remaining tables as-is
 *   - Backfill emails from Stripe for users with stripeCustomerId
 */

import "dotenv/config";
import pg from "pg";

const OLD_DB = process.env.DATABASE_URL!;
const NEW_DB = process.env.NEW_DATABASE_URL!;

if (!OLD_DB || !NEW_DB) {
  console.error("Set DATABASE_URL (old) and NEW_DATABASE_URL (new) in .env");
  process.exit(1);
}

if (OLD_DB === NEW_DB) {
  console.error("OLD and NEW database URLs must be different!");
  process.exit(1);
}

const oldPool = new pg.Pool({ connectionString: OLD_DB });
const newPool = new pg.Pool({ connectionString: NEW_DB });

async function count(pool: pg.Pool, table: string): Promise<number> {
  const { rows } = await pool.query(`SELECT count(*)::int AS c FROM "${table}"`);
  return rows[0].c;
}

async function migrate() {
  console.log("Starting migration...\n");

  // 1. Migrate Users
  console.log("1. Migrating Users...");
  const { rows: users } = await oldPool.query(`SELECT * FROM "User"`);
  for (const u of users) {
    await newPool.query(
      `INSERT INTO "User" (
        id, email, name, image, "emailVerified",
        "discordId", "discordUsername", "discordAvatar", "discordAccessToken",
        "githubId", "githubUsername", "githubConnectedAt",
        "stripeCustomerId", "paymentProvider",
        "subscriptionId", "subscriptionStatus", "roleGranted", "discordTrialExpiry",
        "createdAt", "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      ON CONFLICT (id) DO NOTHING`,
      [
        u.id, null, u.discordUsername, null, null,
        u.discordId, u.discordUsername, u.discordAvatar, u.discordAccessToken,
        u.githubId, u.githubUsername, u.githubConnectedAt,
        u.stripeCustomerId, u.paymentProvider,
        u.subscriptionId, u.subscriptionStatus, u.roleGranted, u.discordTrialExpiry,
        u.createdAt, u.updatedAt,
      ]
    );
  }
  console.log(`   Migrated ${users.length} users`);

  // 2. Migrate Lessons (old table name: "Video")
  console.log("2. Migrating Lessons...");
  const { rows: lessons } = await oldPool.query(`SELECT * FROM "Video"`);
  for (const l of lessons) {
    await newPool.query(
      `INSERT INTO "Lesson" (
        id, category, title, description, type,
        "videoUrl", "youtubeUrl", "markdownContent", "sectionType",
        "order", "createdAt", "updatedAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      ON CONFLICT (id) DO NOTHING`,
      [
        l.id, l.category, l.title, l.description, l.type,
        null, l.youtubeUrl, l.markdownContent, l.sectionType,
        l.order, l.createdAt, l.updatedAt,
      ]
    );
  }
  console.log(`   Migrated ${lessons.length} lessons`);

  // 3. Migrate LessonProgress (old table name: "VideoProgress", old column: "videoId")
  console.log("3. Migrating LessonProgress...");
  const { rows: progress } = await oldPool.query(`SELECT * FROM "VideoProgress"`);
  for (const p of progress) {
    await newPool.query(
      `INSERT INTO "LessonProgress" (
        id, "userId", "lessonId", "completedAt", "uncheckedAt"
      ) VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (id) DO NOTHING`,
      [p.id, p.userId, p.videoId, p.completedAt, p.uncheckedAt]
    );
  }
  console.log(`   Migrated ${progress.length} lesson progress records`);

  // 4. Migrate InviteLink
  console.log("4. Migrating InviteLink...");
  const { rows: invites } = await oldPool.query(`SELECT * FROM "InviteLink"`);
  for (const inv of invites) {
    await newPool.query(
      `INSERT INTO "InviteLink" (id, token, tier, "usedAt", "discordId", "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [inv.id, inv.token, inv.tier, inv.usedAt, inv.discordId, inv.createdAt]
    );
  }
  console.log(`   Migrated ${invites.length} invite links`);

  // 5. Migrate PageEvent
  console.log("5. Migrating PageEvent...");
  const pageEventCount = await count(oldPool, "PageEvent");
  const { rows: pageEvents } = await oldPool.query(`SELECT * FROM "PageEvent"`);
  for (const pe of pageEvents) {
    await newPool.query(
      `INSERT INTO "PageEvent" (
        id, product, type, "visitorId", "sessionId",
        country, referrer, "stripeCustomerId", revenue, currency, "createdAt"
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      ON CONFLICT (id) DO NOTHING`,
      [pe.id, pe.product, pe.type, pe.visitorId, pe.sessionId,
       pe.country, pe.referrer, pe.stripeCustomerId, pe.revenue, pe.currency, pe.createdAt]
    );
  }
  console.log(`   Migrated ${pageEventCount} page events`);

  // 6. Migrate TrialDiscordMessage
  console.log("6. Migrating TrialDiscordMessage...");
  const { rows: trialMsgs } = await oldPool.query(`SELECT * FROM "TrialDiscordMessage"`);
  for (const tm of trialMsgs) {
    await newPool.query(
      `INSERT INTO "TrialDiscordMessage" (
        id, "appName", "appUserId", "originalTransactionId", "discordMessageId", "createdAt"
      ) VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (id) DO NOTHING`,
      [tm.id, tm.appName, tm.appUserId, tm.originalTransactionId, tm.discordMessageId, tm.createdAt]
    );
  }
  console.log(`   Migrated ${trialMsgs.length} trial Discord messages`);

  // 7. Backfill emails from Stripe
  console.log("\n7. Backfilling emails from Stripe...");
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn("   STRIPE_SECRET_KEY not set, skipping email backfill");
  } else {
    const { rows: stripeUsers } = await newPool.query(
      `SELECT id, "stripeCustomerId" FROM "User" WHERE "stripeCustomerId" IS NOT NULL AND email IS NULL`
    );
    let backfilled = 0;
    for (const su of stripeUsers) {
      try {
        const res = await fetch(`https://api.stripe.com/v1/customers/${su.stripeCustomerId}`, {
          headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
        });
        if (res.ok) {
          const customer = await res.json();
          if (customer.email) {
            await newPool.query(
              `UPDATE "User" SET email = $1 WHERE id = $2 AND email IS NULL`,
              [customer.email, su.id]
            );
            backfilled++;
          }
        }
      } catch (err) {
        console.warn(`   Failed to fetch Stripe customer ${su.stripeCustomerId}:`, err);
      }
    }
    console.log(`   Backfilled ${backfilled}/${stripeUsers.length} emails from Stripe`);
  }

  console.log("\nMigration complete!");
  console.log("Next steps:");
  console.log("  1. Verify data in the new database");
  console.log("  2. Swap DATABASE_URL to point to the new database");
  console.log("  3. Keep the old database as a backup");
}

migrate()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await oldPool.end();
    await newPool.end();
  });
