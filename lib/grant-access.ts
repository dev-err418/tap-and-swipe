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
2. your **ASO Solo** license should already be in your inbox, comes with the sub
3. group calls are **mon and wed at 9pm CET, sat at 8pm CET**
4. once you're settled in, drop a quick intro in <#1441443597269467176>: what you're building, where you're at, what you need help with
5. share your build progress: start a thread in <#1480509051489095782>, one per app`;

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

  // Look up by every unique identifier we may receive. Whop can activate
  // before Discord is linked, while Auth.js/quiz/signup flows may already
  // have created a User row for the email. Claiming that row avoids P2002
  // crashes when the Discord bot later posts a guildMemberAdd event.
  const [existingByDiscord, existingByWhop, existingByEmail] = await Promise.all([
    prisma.user.findUnique({ where: { discordId } }),
    whopMembershipId
      ? prisma.user.findUnique({ where: { whopMembershipId } })
      : Promise.resolve(null),
    email ? prisma.user.findUnique({ where: { email } }) : Promise.resolve(null),
  ]);
  const existing = existingByWhop ?? existingByDiscord ?? existingByEmail;
  const alreadyHadActiveRole =
    existing?.subscriptionStatus === "active" && existing.roleGranted;

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

  let upserted;
  if (existing) {
    const claimableConflictIds = new Set<string>();
    for (const conflict of [existingByDiscord, existingByWhop, existingByEmail]) {
      if (!conflict || conflict.id === existing.id || claimableConflictIds.has(conflict.id)) {
        continue;
      }

      const ownsCurrentWhop =
        Boolean(whopMembershipId) && conflict.whopMembershipId === whopMembershipId;
      const isEmailOnlyMatch =
        Boolean(email) && conflict.email === email && !conflict.whopMembershipId;
      const isDiscordOnlyMatch =
        conflict.discordId === discordId && !conflict.whopMembershipId;
      const hasOtherDiscord = conflict.discordId && conflict.discordId !== discordId;
      const hasNonWhopBilling =
        (conflict.paymentProvider && conflict.paymentProvider !== "whop") ||
        conflict.stripeCustomerId ||
        conflict.subscriptionId;

      if (!ownsCurrentWhop && !isEmailOnlyMatch && !isDiscordOnlyMatch) {
        console.warn(
          `[grantAccess:${source}] User row ${conflict.id} owns a different membership; skipping merge for discordId=${discordId}`
        );
        continue;
      }
      if (hasOtherDiscord || hasNonWhopBilling || conflict.githubId) {
        console.warn(
          `[grantAccess:${source}] User row ${conflict.id} has linked identity/billing data; skipping merge for discordId=${discordId}`
        );
        continue;
      }

      const progressCount = await prisma.lessonProgress.count({
        where: { userId: conflict.id },
      });
      if (progressCount > 0) {
        console.warn(
          `[grantAccess:${source}] User row ${conflict.id} has lesson progress; skipping merge for discordId=${discordId}`
        );
        continue;
      }

      claimableConflictIds.add(conflict.id);
    }

    const emailOwnedByOther =
      existingByEmail !== null &&
      existingByEmail.id !== existing.id &&
      !claimableConflictIds.has(existingByEmail.id);
    const whopOwnedByOther =
      existingByWhop !== null &&
      existingByWhop.id !== existing.id &&
      !claimableConflictIds.has(existingByWhop.id);
    const discordOwnedByOther =
      existingByDiscord !== null &&
      existingByDiscord.id !== existing.id &&
      !claimableConflictIds.has(existingByDiscord.id);
    const canClaimDiscordId =
      !existing.discordId ||
      existing.discordId === discordId ||
      (Boolean(whopMembershipId) &&
        existing.whopMembershipId === whopMembershipId &&
        !discordOwnedByOther);

    if (emailOwnedByOther) {
      console.warn(
        `[grantAccess:${source}] email=${email} already belongs to another User row; skipping email update for discordId=${discordId}`
      );
    }
    if (whopOwnedByOther) {
      console.warn(
        `[grantAccess:${source}] whopMembershipId=${whopMembershipId} already belongs to another User row; skipping membership update for discordId=${discordId}`
      );
    }
    if (discordOwnedByOther) {
      console.warn(
        `[grantAccess:${source}] discordId=${discordId} already belongs to another User row; skipping discordId update for User row ${existing.id}`
      );
    }
    if (!canClaimDiscordId) {
      console.warn(
        `[grantAccess:${source}] User row ${existing.id} already has discordId=${existing.discordId}; skipping discordId update to ${discordId}`
      );
    }

    if (claimableConflictIds.size > 0) {
      console.log(
        `[grantAccess:${source}] merging ${claimableConflictIds.size} placeholder User row(s) into ${existing.id} for discordId=${discordId}`
      );
    }

    upserted = await prisma.$transaction(async (tx) => {
      for (const id of claimableConflictIds) {
        await tx.user.delete({ where: { id } });
      }

      return tx.user.update({
        where: { id: existing.id },
        data: {
          ...(canClaimDiscordId && { discordId }),
          discordUsername,
          subscriptionStatus: "active",
          roleGranted,
          tier,
          ...(whopMembershipId && !whopOwnedByOther && { whopMembershipId }),
          ...(email && !emailOwnedByOther && { email }),
          ...(!isActiveElsewhere && { paymentProvider: "whop" }),
          ...(visitorId && !existing.visitorId && { visitorId }),
        },
      });
    });
  } else {
    upserted = await prisma.user.create({
      data: {
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
  }

  // Welcome channel on first successful access activation. Users may already
  // have a Discord-only row from OAuth, but they still need onboarding when
  // the paid membership is first granted.
  const isNewUser = !existingByDiscord;
  const shouldCreateWelcomeChannel = !alreadyHadActiveRole;
  if (shouldCreateWelcomeChannel && roleGranted) {
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

  // ASO license: Pro gets ASO Pro, Starter gets ASO Solo.
  let asoLicenseSent = false;
  if (email && whopMembershipId) {
    try {
      const asoPlan = tier === "starter" ? "solo" : "pro";
      const emailSource = tier === "starter" ? "community-starter" : "community";
      const { key, isNew: isNewLicense } = await generateAsoLicenseWhop(
        email,
        whopMembershipId,
        asoPlan,
        manageUrl
      );
      if (isNewLicense || shouldCreateWelcomeChannel) {
        await sendLicenseKeyEmail(email, key, emailSource, manageUrl);
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
