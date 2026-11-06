import { validWhopMemberships, retrieveWhopDiscord } from "../lib/whop-current";
/**
 * One-time import script for existing Whop memberships.
 *
 * Pulls all active memberships from Whop, finds ones with a linked Discord
 * account, and upserts them into the DB with subscriptionStatus = "active".
 *
 * Usage:
 *   npx tsx scripts/import-whop-users.ts
 */

import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ── Config ──────────────────────────────────────────────────────────

const WHOP_API_KEY = process.env.WHOP_API_KEY!;
const DISCORD_API = "https://discord.com/api/v10";
const GUILD_ID = process.env.DISCORD_GUILD_ID!;
const ROLE_ID = process.env.DISCORD_ROLE_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── Helpers ─────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function addRole(discordUserId: string): Promise<boolean> {
  const res = await fetch(
    `${DISCORD_API}/guilds/${GUILD_ID}/members/${discordUserId}/roles/${ROLE_ID}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (res.status === 429) {
    const body = await res.json();
    const retryAfter = Math.ceil((body.retry_after ?? 5) * 1000);
    console.warn(`  [rate-limit] waiting ${retryAfter}ms...`);
    await sleep(retryAfter);
    return addRole(discordUserId); // retry
  }

  if (res.status === 404) return false;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord addRole failed: ${res.status} ${text}`);
  }
  return true;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("Starting Whop membership import...\n");

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  for await (const membership of validWhopMemberships(WHOP_API_KEY)) {
    const discord = await retrieveWhopDiscord(WHOP_API_KEY, membership);
    const discordId = discord?.id;

    if (!discordId) {
      skipped++;
      continue;
    }

    const discordUsername = discord?.username ?? discordId;

    try {
      const roleGranted = await addRole(discordId);
      if (!roleGranted) {
        console.warn(
          `  [skip] addRole returned false for ${discordId} — not in guild`
        );
      }

      await prisma.user.upsert({
        where: { discordId },
        update: {
          subscriptionStatus: "active",
          roleGranted,
        },
        create: {
          discordId,
          discordUsername,
          subscriptionStatus: "active",
          roleGranted,
        },
      });

      imported++;
      console.log(
        `  [imported] discordId=${discordId} (${discordUsername}) roleGranted=${roleGranted}`
      );

      // Avoid Discord rate limits
      await sleep(500);
    } catch (err) {
      errors++;
      console.error(`  [error] discordId=${discordId}:`, err);
    }
  }
  console.log(`\nDone!`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped (no Discord): ${skipped}`);
  console.log(`  Errors: ${errors}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
