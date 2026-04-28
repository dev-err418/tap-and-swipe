/**
 * Restore Whop migration casualties
 *
 * The 2026-04-28 Whop migration canceled the legacy Stripe community subs.
 * Since those subs carried `discordId` metadata, the Stripe webhook treated
 * each cancellation as a community cancellation and revoked Discord roles +
 * deactivated ASO licenses, even though the same Stripe customer was already
 * paying via the new Whop-managed Stripe sub.
 *
 * This script walks the affected window, verifies each user is currently
 * paying (active Stripe sub on the same customer), and restores access.
 *
 * Usage:
 *   ASO_DATABASE_URL='postgresql://postgres:...@localhost:15433/aso' \
 *     npx tsx scripts/restore-whop-migration.ts [--apply]
 *
 * Pass --apply to actually mutate state. Without it, the script runs in
 * dry-run mode and prints what it would do.
 */

import "dotenv/config";
import Stripe from "stripe";
import { Pool } from "pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APPLY = process.argv.includes("--apply");

const DISCORD_API = "https://discord.com/api/v10";
const GUILD_ID = process.env.DISCORD_GUILD_ID!;
const FULL_ROLE_ID = process.env.DISCORD_ROLE_ID!;
const STARTER_ROLE_ID =
  process.env.DISCORD_STARTER_ROLE_ID ?? process.env.DISCORD_ROLE_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const WHOP_API_KEY = process.env.WHOP_API_KEY!;

const WINDOW_START = new Date("2026-04-28T20:50:00Z");
const WINDOW_END = new Date("2026-04-28T21:00:00Z");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const asoPool = new Pool({ connectionString: process.env.ASO_DATABASE_URL });

function roleIdForTier(tier: string | null | undefined): string {
  return tier === "starter" ? STARTER_ROLE_ID : FULL_ROLE_ID;
}

async function addRole(discordId: string, tier: string | null | undefined) {
  const roleId = roleIdForTier(tier);
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(
      `${DISCORD_API}/guilds/${GUILD_ID}/members/${discordId}/roles/${roleId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (res.status === 404) return false;
    if (res.status === 429) {
      const body = (await res.json().catch(() => ({}))) as {
        retry_after?: number;
      };
      const wait = Math.max((body.retry_after ?? 1) * 1000, 250);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`addRole failed: ${res.status} ${text}`);
    }
    return true;
  }
  throw new Error(`addRole gave up after rate-limit retries`);
}

interface WhopMembership {
  id: string;
  status: string;
  email?: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  manage_url?: string;
  plan?: { id: string };
  discord?: { id?: string } | null;
  metadata?: { discordId?: string; userId?: string };
}

let whopByEmail: Map<string, WhopMembership> | null = null;
let whopByDiscord: Map<string, WhopMembership> | null = null;
let whopByStripeCustomer: Map<string, WhopMembership> | null = null;
let whopByStripeSub: Map<string, WhopMembership> | null = null;

function bestMembership(a: WhopMembership | undefined, b: WhopMembership): WhopMembership {
  if (!a) return b;
  const rank = (s: string) => (s === "active" ? 2 : s === "trialing" ? 1 : 0);
  return rank(b.status) > rank(a.status) ? b : a;
}

async function loadWhopMemberships(): Promise<void> {
  if (whopByEmail) return;
  const byEmail = new Map<string, WhopMembership>();
  const byDiscord = new Map<string, WhopMembership>();
  const byStripeCustomer = new Map<string, WhopMembership>();
  const byStripeSub = new Map<string, WhopMembership>();
  let page = 1;
  while (true) {
    const res = await fetch(
      `https://api.whop.com/api/v2/memberships?per=50&page=${page}`,
      { headers: { Authorization: `Bearer ${WHOP_API_KEY}` } }
    );
    if (!res.ok) break;
    const json = (await res.json()) as {
      data?: WhopMembership[];
      pagination?: { current_page: number; total_page: number };
    };
    for (const m of (json.data ?? [])) {
      if (m.email) {
        const k = m.email.toLowerCase();
        byEmail.set(k, bestMembership(byEmail.get(k), m));
      }
      const did = m.discord?.id ?? m.metadata?.discordId;
      if (did) byDiscord.set(did, bestMembership(byDiscord.get(did), m));
      if (m.stripe_customer_id) {
        byStripeCustomer.set(
          m.stripe_customer_id,
          bestMembership(byStripeCustomer.get(m.stripe_customer_id), m)
        );
      }
      if (m.stripe_subscription_id) {
        byStripeSub.set(
          m.stripe_subscription_id,
          bestMembership(byStripeSub.get(m.stripe_subscription_id), m)
        );
      }
    }
    const pag = json.pagination;
    if (!pag || pag.current_page >= pag.total_page) break;
    page++;
  }
  whopByEmail = byEmail;
  whopByDiscord = byDiscord;
  whopByStripeCustomer = byStripeCustomer;
  whopByStripeSub = byStripeSub;
  console.log(
    `Loaded Whop memberships: email=${byEmail.size} discord=${byDiscord.size} stripeCustomer=${byStripeCustomer.size} stripeSub=${byStripeSub.size}`
  );
}

function isActiveStatus(s: string): boolean {
  return s === "active" || s === "trialing";
}

async function findWhopMembership(opts: {
  email?: string | null;
  discordId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubId?: string | null;
}): Promise<WhopMembership | null> {
  await loadWhopMemberships();
  const lookups: Array<WhopMembership | undefined> = [
    opts.stripeSubId ? whopByStripeSub!.get(opts.stripeSubId) : undefined,
    opts.stripeCustomerId ? whopByStripeCustomer!.get(opts.stripeCustomerId) : undefined,
    opts.discordId ? whopByDiscord!.get(opts.discordId) : undefined,
    opts.email ? whopByEmail!.get(opts.email.toLowerCase()) : undefined,
  ];
  for (const m of lookups) if (m && isActiveStatus(m.status)) return m;
  return null;
}

async function getCustomerEmail(customerId: string): Promise<string | null> {
  try {
    const cust = await stripe.customers.retrieve(customerId);
    if ("deleted" in cust && cust.deleted) return null;
    return ("email" in cust ? cust.email : null) ?? null;
  } catch {
    return null;
  }
}

async function findActiveStripeSub(customerId: string): Promise<Stripe.Subscription | null> {
  try {
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });
    return (
      subs.data.find((s) => s.status === "active") ??
      subs.data.find((s) => s.status === "trialing") ??
      null
    );
  } catch {
    return null;
  }
}

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}`);
  console.log(
    `Window: ${WINDOW_START.toISOString()} → ${WINDOW_END.toISOString()}\n`
  );

  // Affected community users (revoked by webhook during the migration window)
  const users = await prisma.user.findMany({
    where: {
      subscriptionStatus: "canceled",
      roleGranted: false,
      updatedAt: { gte: WINDOW_START, lte: WINDOW_END },
      discordId: { not: null },
    },
  });

  console.log(`Found ${users.length} potentially affected community users.\n`);

  let restored = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    const tag = `${user.discordUsername ?? "?"} (${user.discordId})`;
    if (!user.stripeCustomerId) {
      console.log(`SKIP  ${tag}: no stripeCustomerId`);
      skipped++;
      continue;
    }

    const activeSub = await findActiveStripeSub(user.stripeCustomerId);
    if (!activeSub) {
      console.log(
        `SKIP  ${tag}: no active Stripe sub on ${user.stripeCustomerId} (likely truly canceled)`
      );
      skipped++;
      continue;
    }

    const email = await getCustomerEmail(user.stripeCustomerId);
    const whop = await findWhopMembership({
      email,
      discordId: user.discordId,
      stripeCustomerId: user.stripeCustomerId,
      stripeSubId: activeSub.id,
    });

    console.log(
      `RESTORE ${tag}  customer=${user.stripeCustomerId}  sub=${activeSub.id}  email=${email ?? "?"}  whop=${whop?.id ?? "?"}`
    );

    if (!APPLY) {
      restored++;
      continue;
    }

    try {
      const roleGranted = await addRole(user.discordId!, user.tier);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: "active",
          subscriptionId: activeSub.id,
          paymentProvider: "whop",
          roleGranted,
        },
      });

      // Reactivate ASO licenses on this Stripe customer
      await asoPool.query(
        `UPDATE aso_licenses
            SET active = true
          WHERE stripe_customer_id = $1
            AND active = false`,
        [user.stripeCustomerId]
      );

      // Backfill whop linkage so future Whop deactivations target the right row
      if (whop) {
        await asoPool.query(
          `UPDATE aso_licenses
              SET whop_membership_id = $1,
                  whop_manage_url = COALESCE($2, whop_manage_url),
                  provider = 'whop'
            WHERE stripe_customer_id = $3
              AND active = true`,
          [whop.id, whop.manage_url ?? null, user.stripeCustomerId]
        );
      }

      console.log(`   → role=${roleGranted} db=updated aso=reactivated whop=${whop ? "linked" : "not-found"}`);
      restored++;
    } catch (err) {
      console.error(`   ✗ failed:`, err);
      failed++;
    }
  }

  // Pure-ASO casualties: licenses still keyed on stripe_customer_id where the
  // owner has migrated to Whop. Backfill whop_membership_id on currently-active
  // ones so the next Whop event is correctly applied. Also reactivate any
  // inactive license whose customer still has an active Stripe sub.
  console.log("\n--- ASO license backfill ---");
  const orphanLicenses = await asoPool.query<{
    key: string;
    email: string;
    stripe_customer_id: string;
    whop_membership_id: string | null;
    active: boolean;
  }>(
    `SELECT key, email, stripe_customer_id, whop_membership_id, active
       FROM aso_licenses
      WHERE provider = 'stripe'
        AND stripe_customer_id IS NOT NULL
        AND whop_membership_id IS NULL`
  );
  console.log(`Found ${orphanLicenses.rows.length} stripe-keyed licenses with no Whop link.`);

  for (const lic of orphanLicenses.rows) {
    const whop = await findWhopMembership({
      email: lic.email,
      stripeCustomerId: lic.stripe_customer_id,
    });
    if (!whop) continue;

    const activeSub = await findActiveStripeSub(lic.stripe_customer_id);
    const shouldActivate = !lic.active && !!activeSub;

    console.log(
      `LINK  ${lic.email}  key=${lic.key}  whop=${whop.id}  active=${lic.active}${shouldActivate ? " → reactivate" : ""}`
    );

    if (!APPLY) continue;

    await asoPool.query(
      `UPDATE aso_licenses
          SET whop_membership_id = $1,
              whop_manage_url = COALESCE($2, whop_manage_url),
              provider = 'whop'${shouldActivate ? ", active = true" : ""}
        WHERE key = $3`,
      [whop.id, whop.manage_url ?? null, lic.key]
    );
  }

  console.log(`\nDone. restored=${restored} skipped=${skipped} failed=${failed}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await asoPool.end();
  });
