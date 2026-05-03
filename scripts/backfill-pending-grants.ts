/**
 * Backfill script: walks all active Whop memberships and runs the same
 * grant flow as the new Discord-join webhook. Catches users who paid
 * before we wired up the bot and are stuck with no role / no User row.
 *
 * Usage:
 *   npx tsx scripts/backfill-pending-grants.ts            # apply
 *   npx tsx scripts/backfill-pending-grants.ts --dry-run  # report only
 *
 * Requires the SSH tunnel from TUNNEL.md (DB on Oracle VPS).
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });
loadEnv({ path: ".env" });

import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const WHOP_API_KEY = process.env.WHOP_API_KEY!;
const WHOP_STARTER_PLAN_ID = process.env.WHOP_STARTER_PLAN_ID ?? "plan_hH1PeE0AurETn";

const dryRun = process.argv.includes("--dry-run");

interface WhopMembership {
  id: string;
  status?: string;
  email?: string | null;
  manage_url?: string | null;
  discord?: { id?: string; username?: string } | string | null;
  plan?: { id?: string } | string | null;
  user?: { email?: string } | null;
}

function extractDiscord(m: WhopMembership): { id: string; username: string } | null {
  const d = m.discord;
  if (typeof d === "string" && d.length > 0) return { id: d, username: d };
  if (typeof d === "object" && d !== null && d.id) {
    return { id: String(d.id), username: d.username ?? String(d.id) };
  }
  return null;
}

function extractPlanId(m: WhopMembership): string | null {
  const p = m.plan;
  if (typeof p === "string") return p;
  if (typeof p === "object" && p !== null && p.id) return p.id;
  return null;
}

function extractEmail(m: WhopMembership): string | null {
  if (m.email) return m.email;
  if (m.user?.email) return m.user.email;
  return null;
}

async function fetchAllValidMemberships(): Promise<WhopMembership[]> {
  const all: WhopMembership[] = [];
  let page = 1;
  while (true) {
    const url = new URL("https://api.whop.com/api/v2/memberships");
    url.searchParams.set("valid", "true");
    url.searchParams.set("per", "50");
    url.searchParams.set("page", String(page));
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${WHOP_API_KEY}` },
    });
    if (!res.ok) {
      throw new Error(`Whop API page=${page} failed: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as { data?: WhopMembership[] };
    const batch = json.data ?? [];
    if (batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 50) break;
    page++;
  }
  return all;
}

async function main() {
  console.log(`Backfill ${dryRun ? "(DRY RUN)" : ""} starting...`);
  const memberships = await fetchAllValidMemberships();
  console.log(`Loaded ${memberships.length} valid Whop memberships`);

  const pending: Array<{
    membershipId: string;
    discordId: string;
    discordUsername: string;
    email: string | null;
    tier: "full" | "starter";
    manageUrl: string | null;
    reason: string;
  }> = [];

  for (const m of memberships) {
    const discord = extractDiscord(m);
    if (!discord) continue;

    const tier: "full" | "starter" =
      extractPlanId(m) === WHOP_STARTER_PLAN_ID ? "starter" : "full";

    const existingByDiscord = await prisma.user.findUnique({
      where: { discordId: discord.id },
      select: { roleGranted: true, subscriptionStatus: true, tier: true },
    });

    if (
      existingByDiscord?.roleGranted &&
      existingByDiscord.subscriptionStatus === "active" &&
      existingByDiscord.tier === tier
    ) {
      continue;
    }

    pending.push({
      membershipId: m.id,
      discordId: discord.id,
      discordUsername: discord.username,
      email: extractEmail(m),
      tier,
      manageUrl: m.manage_url ?? null,
      reason: !existingByDiscord
        ? "no_user_row"
        : !existingByDiscord.roleGranted
          ? "role_not_granted"
          : existingByDiscord.subscriptionStatus !== "active"
            ? `status=${existingByDiscord.subscriptionStatus ?? "null"}`
            : "tier_mismatch",
    });
  }

  console.log(`\nFound ${pending.length} memberships needing a grant:`);
  for (const p of pending) {
    console.log(`  - ${p.discordUsername} (${p.discordId}) tier=${p.tier} reason=${p.reason}`);
  }

  if (dryRun) {
    console.log("\nDry run complete. Re-run without --dry-run to apply.");
    return;
  }

  if (pending.length === 0) {
    console.log("\nNothing to do.");
    return;
  }

  // Import grantAccess lazily so dry-run doesn't pull in all the Discord deps
  const { grantAccess } = await import("../lib/grant-access");

  let granted = 0;
  let failed = 0;
  for (const p of pending) {
    try {
      const res = await grantAccess({
        discordId: p.discordId,
        discordUsername: p.discordUsername,
        tier: p.tier,
        email: p.email ?? undefined,
        whopMembershipId: p.membershipId,
        manageUrl: p.manageUrl ?? undefined,
        source: "backfill",
      });
      console.log(
        `  [ok] ${p.discordUsername} → roleGranted=${res.roleGranted} new=${res.isNewUser}`
      );
      granted++;
      // Small delay between grants to avoid Discord rate limits
      await new Promise((r) => setTimeout(r, 250));
    } catch (err) {
      console.error(`  [fail] ${p.discordUsername}:`, err);
      failed++;
    }
  }

  console.log(`\nDone. granted=${granted} failed=${failed}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
