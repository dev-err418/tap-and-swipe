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

function extractDiscordId(membership: Record<string, unknown>): string | null {
  // Try top-level "discord" field (could be string or object with .id)
  const discord = membership.discord;
  if (typeof discord === "string" && discord.length > 0) return discord;
  if (
    typeof discord === "object" &&
    discord !== null &&
    "id" in (discord as Record<string, unknown>)
  ) {
    return String((discord as Record<string, string>).id);
  }
  return null;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("Starting Whop membership import...\n");

  let imported = 0;
  let skipped = 0;
  let errors = 0;
  let page = 1;

  // Paginate through all active memberships (V2 API includes discord field)
  while (true) {
    const url = new URL("https://api.whop.com/api/v2/memberships");
    url.searchParams.set("valid", "true");
    url.searchParams.set("per", "50");
    url.searchParams.set("page", String(page));

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${WHOP_API_KEY}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`API request failed: ${res.status} ${text}`);
      process.exit(1);
    }

    const json = await res.json();
    const memberships: Record<string, unknown>[] = json.data ?? [];

    if (memberships.length === 0) break;

    for (const membership of memberships) {
      const discordId = extractDiscordId(membership);

      if (!discordId) {
        skipped++;
        continue;
      }

      // Use discord username from Whop if available, fall back to ID
      const discord = membership.discord as Record<string, unknown> | null;
      const discordUsername =
        (typeof discord?.username === "string" ? discord.username : null) ??
        discordId;

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

    // V2 pagination uses current_page / total_page
    const totalPages = json.pagination?.total_page ?? 1;
    if (page >= totalPages) break;
    page++;
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
