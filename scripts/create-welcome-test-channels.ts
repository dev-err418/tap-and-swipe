/**
 * Create two test welcome channels (builder + starter tier) under the
 * Welcome category, with the admin user added so they can preview the
 * exact messages the Whop webhook will send to new subscribers.
 *
 * Usage:
 *   npx tsx scripts/create-welcome-test-channels.ts
 *
 * Env required:
 *   DISCORD_GUILD_ID
 *   DISCORD_BOT_TOKEN
 *   DISCORD_CLIENT_ID
 *   ADMIN_DISCORD_ID
 *   DISCORD_WELCOME_CATEGORY_ID
 */

import "dotenv/config";
import {
  createPrivateChannel,
  sendChannelMessage,
} from "../lib/discord";

async function createWelcomeTest(
  tier: "full" | "starter",
  channelLabel: string
) {
  const adminId = process.env.ADMIN_DISCORD_ID!;
  const welcomeCategoryId = process.env.DISCORD_WELCOME_CATEGORY_ID!;

  const channelName = `👋・welcome-test-${channelLabel}`;
  console.log(`[test] Creating ${channelName} (${tier} tier)...`);

  const channelId = await createPrivateChannel(
    adminId,
    channelName,
    welcomeCategoryId
  );
  console.log(`[test] Created channel ${channelId}`);

  const steps =
    tier === "full"
      ? `1. the course is at https://tap-and-swipe.com/learn, start with the **Getting Started** category
2. your **ASO Pro** license should already be in your inbox, comes with the sub
3. group calls are **wed and sun at 9pm CET**
4. once you're settled in, drop a quick intro in <#1441443597269467176>: what you're building, where you're at, what you need help with`
      : `1. the course is at https://tap-and-swipe.com/learn, start with the **Getting Started** category
2. group calls are **wed and sun at 9pm CET**
3. once you're settled in, drop a quick intro in <#1441443597269467176>: what you're building, where you're at, what you need help with`;

  const message = `hey <@${adminId}>, welcome in 👋

happy you made it. this is your channel, ping me anything you need and i'll get to it

heads up: this channel auto-deletes in 72h, so don't leave anything important in here

few things to get you sorted:
${steps}`;

  await sendChannelMessage(channelId, message, true);
  console.log(`[test] Sent messages to ${channelName}`);
}

async function main() {
  if (!process.env.DISCORD_WELCOME_CATEGORY_ID) {
    console.error("DISCORD_WELCOME_CATEGORY_ID env var is not set.");
    process.exit(1);
  }

  await createWelcomeTest("full", "builder");
  await createWelcomeTest("starter", "starter");
  console.log("[test] Done.");
}

main().catch((err) => {
  console.error("[test] Failed:", err);
  process.exit(1);
});
