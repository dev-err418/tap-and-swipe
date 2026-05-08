/**
 * Re-run grantAccess for a single discordId. Useful when the bot's
 * guildMemberAdd webhook failed (e.g. before the P2002 fix shipped) and
 * the user is now in the guild without their role / welcome channel.
 *
 * Looks up the active Whop membership for the discordId, then runs the
 * full grantAccess pipeline: claim the placeholder User row, assign the
 * correct tier role, create the welcome channel.
 *
 * Idempotent — safe to run multiple times for the same user.
 *
 * Usage:
 *   npx tsx scripts/backfill-grant-access.ts <discordId> [discordUsername]
 *
 * Required env (must be present where this runs — typically Coolify):
 *   DATABASE_URL, WHOP_API_KEY, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID,
 *   DISCORD_ROLE_ID, DISCORD_STARTER_ROLE_ID, DISCORD_WELCOME_CATEGORY_ID
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });
loadEnv({ path: ".env" });

import {
  findActiveMembershipByDiscordId,
  tierFromWhopPlanId,
} from "../lib/whop";
import { grantAccess } from "../lib/grant-access";

async function main() {
  const discordId = process.argv[2];
  const usernameOverride = process.argv[3];

  if (!discordId) {
    console.error(
      "Usage: npx tsx scripts/backfill-grant-access.ts <discordId> [discordUsername]",
    );
    process.exit(1);
  }

  console.log(`Looking up Whop membership for discordId=${discordId}…`);
  const match = await findActiveMembershipByDiscordId(discordId);
  if (!match) {
    console.error(`No active Whop membership found for discordId=${discordId}`);
    process.exit(1);
  }

  const tier = tierFromWhopPlanId(match.planId);
  console.log(
    `Found membership=${match.membershipId} email=${match.email} tier=${tier}`,
  );

  const result = await grantAccess({
    discordId: match.discord.id,
    discordUsername: usernameOverride ?? match.discord.username,
    tier,
    email: match.email ?? undefined,
    whopMembershipId: match.membershipId,
    manageUrl: match.manageUrl ?? undefined,
    source: "backfill",
  });

  console.log("Result:", result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
