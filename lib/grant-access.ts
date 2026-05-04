import { prisma } from "@/lib/prisma";
import {
  addToGuild,
  addRole,
  removeRole,
  createPrivateChannel,
  sendChannelMessage,
} from "@/lib/discord";
import { generateAsoLicenseWhop } from "@/lib/aso-db";
import { sendLicenseKeyEmail } from "@/lib/aso-email";

export type GrantTier = "full" | "starter";

export interface GrantAccessInput {
  discordId: string;
  discordUsername: string;
  tier: GrantTier;
  email?: string;
  whopMembershipId?: string;
  manageUrl?: string;
  visitorId?: string;
  source: "whop-webhook" | "discord-join" | "backfill";
}

export interface GrantAccessResult {
  userId: string;
  isNewUser: boolean;
  roleGranted: boolean;
  asoLicenseSent: boolean;
}

function welcomeMessage(discordId: string, tier: GrantTier): string {
  const steps =
    tier === "full"
      ? `1. the course is at https://tap-and-swipe.com/learn, start with the **Getting Started** category
2. your **ASO Pro** license should already be in your inbox, comes with the sub
3. group calls are **mon and wed at 9pm CET, sat at 8pm CET**
4. once you're settled in, drop a quick intro in <#1441443597269467176>: what you're building, where you're at, what you need help with
5. share your build progress: start a thread in <#1480509051489095782>, one per app`
      : `1. the course is at https://tap-and-swipe.com/learn, start with the **Getting Started** category
2. group calls are **mon and wed at 9pm CET, sat at 8pm CET**
3. once you're settled in, drop a quick intro in <#1441443597269467176>: what you're building, where you're at, what you need help with
4. share your build progress: start a thread in <#1480509051489095782>, one per app`;

  return `hey <@${discordId}>, welcome in 👋

happy you made it. this is your channel, ping me anything you need and i'll get to it

heads up: this channel auto-deletes in 72h, so don't leave anything important in here

few things to get you sorted:
${steps}`;
}

/**
 * Grant Community access to a Discord user: add them to the guild (if we
 * have an OAuth token), assign the right role, upsert their User record,
 * create a welcome channel on first activation, and ensure an ASO license
 * exists for Pro tier.
 *
 * Idempotent: safe to call multiple times for the same user. Used by the
 * Whop webhook (membership.activated), the Discord member-joined endpoint
 * (catches users who pay before linking Discord), and the backfill script.
 */
export async function grantAccess(input: GrantAccessInput): Promise<GrantAccessResult> {
  const { discordId, discordUsername, tier, email, whopMembershipId, manageUrl, visitorId, source } = input;

  // Look up by discordId first; fall back to whopMembershipId so we can
  // claim a placeholder row created when Whop activated without Discord.
  const existingByDiscord = await prisma.user.findUnique({ where: { discordId } });
  const existingByWhop =
    !existingByDiscord && whopMembershipId
      ? await prisma.user.findUnique({ where: { whopMembershipId } })
      : null;
  const existing = existingByDiscord ?? existingByWhop;

  // Add to guild if we have a stored OAuth token (only the case for users
  // who logged in via our Discord OAuth before paying)
  if (existing?.discordAccessToken) {
    await addToGuild(discordId, existing.discordAccessToken).catch((err) =>
      console.warn(`[grantAccess:${source}] addToGuild failed for ${discordId}:`, err)
    );
  }

  // Plan change: remove the old-tier role if the stored tier differs
  const previousTier =
    existing?.tier === "starter" || existing?.tier === "full" ? existing.tier : null;
  if (previousTier && previousTier !== tier) {
    await removeRole(discordId, previousTier).catch((err) =>
      console.warn(
        `[grantAccess:${source}] failed to remove previous ${previousTier} role for ${discordId}:`,
        err
      )
    );
    console.log(`[grantAccess:${source}] plan change ${previousTier} → ${tier} for ${discordId}`);
  }

  const roleGranted = await addRole(discordId, tier).catch((err) => {
    console.warn(`[grantAccess:${source}] addRole threw for ${discordId}:`, err);
    return false;
  });
  if (!roleGranted) {
    console.warn(
      `[grantAccess:${source}] addRole returned false for ${discordId} — user may not be in the guild yet`
    );
  }

  // Don't overwrite paymentProvider if the user is already paying via another provider
  const isActiveElsewhere =
    existing &&
    existing.paymentProvider !== "whop" &&
    existing.paymentProvider !== null &&
    existing.subscriptionStatus === "active";

  const upserted = await prisma.user.upsert({
    where: { discordId },
    update: {
      discordUsername,
      subscriptionStatus: "active",
      roleGranted,
      tier,
      ...(whopMembershipId && { whopMembershipId }),
      ...(email && { email }),
      ...(!isActiveElsewhere && { paymentProvider: "whop" }),
      ...(visitorId && !existing?.visitorId && { visitorId }),
    },
    create: {
      discordId,
      discordUsername,
      subscriptionStatus: "active",
      paymentProvider: "whop",
      roleGranted,
      tier,
      ...(whopMembershipId && { whopMembershipId }),
      ...(email && { email }),
      ...(visitorId && { visitorId }),
    },
  });

  // If we found a placeholder by whopMembershipId but it's a different row
  // than the discordId-keyed row, remove the placeholder so we don't keep two
  const isClaimingPlaceholder = !!existingByWhop && !existingByDiscord;
  if (isClaimingPlaceholder && existingByWhop && existingByWhop.id !== upserted.id) {
    await prisma.user.delete({ where: { id: existingByWhop.id } }).catch((err) =>
      console.warn(
        `[grantAccess:${source}] failed to remove placeholder ${existingByWhop.id}:`,
        err
      )
    );
  }

  // Welcome channel only on truly first activation (no prior Discord link)
  const isNewUser = !existingByDiscord;
  if (isNewUser && roleGranted) {
    try {
      const usernameSlug = discordUsername.toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const channelName = `👋・welcome-${usernameSlug}`;
      const channelId = await createPrivateChannel(
        discordId,
        channelName,
        process.env.DISCORD_WELCOME_CATEGORY_ID
      );
      await sendChannelMessage(channelId, welcomeMessage(discordId, tier), true);
    } catch (err) {
      console.error(`[grantAccess:${source}] failed to create welcome channel for ${discordId}:`, err);
    }
  }

  // ASO license: Pro tier only
  let asoLicenseSent = false;
  if (email && tier === "full" && whopMembershipId) {
    try {
      const { key, isNew: isNewLicense } = await generateAsoLicenseWhop(
        email,
        whopMembershipId,
        "pro",
        manageUrl
      );
      if (isNewLicense || isNewUser) {
        await sendLicenseKeyEmail(email, key, "community", manageUrl);
        asoLicenseSent = true;
      }
    } catch (err) {
      console.error(`[grantAccess:${source}] ASO license generation failed:`, err);
    }
  }

  console.log(
    `[grantAccess:${source}] discordId=${discordId} tier=${tier} roleGranted=${roleGranted} new=${isNewUser}`
  );

  return {
    userId: upserted.id,
    isNewUser,
    roleGranted,
    asoLicenseSent,
  };
}
