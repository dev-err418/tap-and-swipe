/**
 * Manual grant-role CLI script
 *
 * Usage:
 *   npx tsx scripts/grant-role.ts <discordId | cus_* | sub_*>
 *
 * Self-contained — no @/ imports so it works with plain `npx tsx`.
 */

import "dotenv/config";
import Stripe from "stripe";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ── Config ──────────────────────────────────────────────────────────

const DISCORD_API = "https://discord.com/api/v10";
const GUILD_ID = process.env.DISCORD_GUILD_ID!;
const ROLE_ID = process.env.DISCORD_ROLE_ID!;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ── Helpers ─────────────────────────────────────────────────────────

async function addToGuild(
  discordUserId: string,
  accessToken: string
): Promise<boolean> {
  const res = await fetch(
    `${DISCORD_API}/guilds/${GUILD_ID}/members/${discordUserId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_token: accessToken,
        roles: [ROLE_ID],
      }),
    }
  );

  if (res.status === 201) return true; // added to guild
  if (res.status === 204) return true; // already in guild

  const text = await res.text();
  console.warn(`addToGuild failed: ${res.status} ${text}`);
  return false;
}

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

  if (res.status === 404) return false;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord addRole failed: ${res.status} ${text}`);
  }
  return true;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: npx tsx scripts/grant-role.ts <discordId | cus_* | sub_*>");
    process.exit(1);
  }

  // 1. Look up user
  let user;
  if (input.startsWith("cus_")) {
    user = await prisma.user.findUnique({ where: { stripeCustomerId: input } });
  } else if (input.startsWith("sub_")) {
    user = await prisma.user.findUnique({ where: { subscriptionId: input } });
  } else {
    user = await prisma.user.findUnique({ where: { discordId: input } });
  }

  if (!user) {
    console.error(`User not found for: ${input}`);
    process.exit(1);
  }

  console.log(`Found user: discordId=${user.discordId} customer=${user.stripeCustomerId} sub=${user.subscriptionId} roleGranted=${user.roleGranted}`);

  // 2. Verify Stripe subscription is active
  if (!user.subscriptionId) {
    console.error("No subscription ID on user record");
    process.exit(1);
  }

  const subscription = await stripe.subscriptions.retrieve(user.subscriptionId);
  console.log(`Stripe subscription status: ${subscription.status}`);

  if (!["active", "trialing"].includes(subscription.status)) {
    console.error(`Subscription is not active (status: ${subscription.status}). Aborting.`);
    process.exit(1);
  }

  // 3. Try adding to guild first (if we have their access token), then add role
  if (user.discordAccessToken) {
    const addedToGuild = await addToGuild(user.discordId, user.discordAccessToken);
    if (addedToGuild) {
      console.log("User added to guild (or was already in it)");
    } else {
      console.warn("WARNING: addToGuild failed — access token may be expired.");
    }
  } else {
    console.warn("No Discord access token stored — cannot auto-add to guild.");
  }

  const roleAdded = await addRole(user.discordId);

  if (roleAdded) {
    console.log("Discord role granted successfully");
  } else {
    console.warn("WARNING: addRole returned false — user is NOT in the Discord guild.");
    console.warn("Ask the user to re-login (to refresh their token), then re-run this script.");
  }

  // 4. Update DB to match actual result
  await prisma.user.update({
    where: { discordId: user.discordId },
    data: { roleGranted: roleAdded },
  });
  console.log(`DB updated: roleGranted=${roleAdded}`);

  // 5. Fire DataFast goal if configured
  if (process.env.DATAFAST_API_KEY) {
    try {
      const res = await fetch("https://datafa.st/api/v1/goals", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DATAFAST_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "stripe_checkout_completed",
          metadata: { discordId: user.discordId, manual: true },
        }),
      });
      if (res.ok) {
        console.log("DataFast goal fired");
      } else {
        console.warn(`DataFast goal failed: ${res.status}`);
      }
    } catch (e) {
      console.warn("DataFast goal error:", e);
    }
  }

  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
