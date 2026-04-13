import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { exchangeCode, getUser, addToGuildWithRoles, createPrivateChannel, sendChannelMessage } from "@/lib/discord";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

const STATE_COOKIE = "discord_oauth_state";
const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // User denied the OAuth prompt
  if (error) {
    return NextResponse.redirect(`${APP_URL}/app-sprint-community?error=oauth_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/app-sprint-community?error=missing_params`);
  }

  // Verify CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${APP_URL}/app-sprint-community?error=invalid_state`);
  }

  let statePayload: Record<string, unknown>;
  try {
    const { payload } = await jwtVerify(savedState, SECRET);
    statePayload = payload as Record<string, unknown>;
  } catch {
    return NextResponse.redirect(`${APP_URL}/app-sprint-community?error=expired_state`);
  }

  const rawRedirect = typeof statePayload.redirect === "string" ? statePayload.redirect as string : null;
  const isRoadmapRedirect = !!rawRedirect?.startsWith("roadmap");
  // Sanitize: only allow alphanumeric, hyphens, and slashes to prevent path traversal
  const redirectTarget = isRoadmapRedirect
    ? rawRedirect!.replace(/[^a-zA-Z0-9\-/]/g, "")
    : null;

  const inviteToken = typeof statePayload.invite === "string" ? statePayload.invite : null;
  const bundleFlow = typeof statePayload.flow === "string" ? statePayload.flow : null;
  const isBundleFlow = bundleFlow === "bundle-community" || bundleFlow === "bundle-aso";
  const isYearlyBonusFlow = bundleFlow === "aso-yearly-bonus";

  try {
    // Exchange code for access token
    const redirectUri = `${APP_URL}/api/auth/discord/callback`;
    const tokenData = await exchangeCode(code, redirectUri);

    // Fetch Discord user profile
    const discordUser = await getUser(tokenData.access_token);

    // Upsert user in database (store access token for guild join later)
    const user = await prisma.user.upsert({
      where: { discordId: discordUser.id },
      update: {
        discordUsername: discordUser.global_name || discordUser.username,
        discordAvatar: discordUser.avatar,
        discordAccessToken: tokenData.access_token,
      },
      create: {
        discordId: discordUser.id,
        discordUsername: discordUser.global_name || discordUser.username,
        discordAvatar: discordUser.avatar,
        discordAccessToken: tokenData.access_token,
      },
    });

    // --- Invite redemption flow ---
    if (inviteToken) {
      // Re-validate invite (race condition guard)
      const invite = await prisma.inviteLink.findUnique({
        where: { token: inviteToken },
      });

      if (!invite || invite.usedAt) {
        return NextResponse.redirect(`${APP_URL}/invite/invalid`);
      }

      // Mark invite as used
      await prisma.inviteLink.update({
        where: { id: invite.id },
        data: { usedAt: new Date(), discordId: discordUser.id },
      });

      // Add to guild with Student + Launcher roles
      const roleIds = [
        process.env.DISCORD_ROLE_ID!,
        process.env.DISCORD_LAUNCHER_ROLE_ID!,
      ];
      await addToGuildWithRoles(discordUser.id, tokenData.access_token, roleIds);

      // Create private support channel and send welcome messages
      const username = (discordUser.global_name || discordUser.username).toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const channelName = `🎧・support-${username}`;
      try {
        const channelId = await createPrivateChannel(discordUser.id, channelName);

        const welcomeMsg = `Hey <@${discordUser.id}>, it's Arthur! 👋

Welcome to the AppSprint program 🎉

To get started, here's a short intro video:
https://youtu.be/AOH2aOJwp_Y`;

        const stepsMsg = `Here are the next steps:
1️⃣ Watch the video above
2️⃣ Access your course on the platform: https://tap-and-swipe.com/app-sprint/roadmap
3️⃣ Have a read through this report on the state of subscription apps, great insights on the mobile app market: https://www.revenuecat.com/pdf/state-of-subscription-apps-2025.pdf

We're super excited to kick this off with you!
Feel free to reach out here if you have any questions 😉`;

        const kickoffMsg = `Here's the link to book your kickoff call, just a quick chat to get you started and welcome you on board 🚀
<https://cal.com/arthur-builds-stuff/-app-sprint-kickoff>`;

        await sendChannelMessage(channelId, welcomeMsg);
        await sendChannelMessage(channelId, stepsMsg, true);
        await sendChannelMessage(channelId, kickoffMsg);
      } catch (err) {
        console.error("[invite] Failed to create support channel:", err);
      }

      // Upsert PremiumUser with the invite's tier
      await prisma.premiumUser.upsert({
        where: { discordId: discordUser.id },
        update: { tier: invite.tier },
        create: { discordId: discordUser.id, tier: invite.tier },
      });

      // Set subscription status active so existing guards work
      await prisma.user.update({
        where: { discordId: discordUser.id },
        data: { subscriptionStatus: "active" },
      });

      // Create 7-day session and redirect to Discord server
      await createSession(
        {
          discordId: discordUser.id,
          discordUsername: discordUser.global_name || discordUser.username,
          discordAvatar: discordUser.avatar,
        },
        "7d"
      );

      return NextResponse.redirect(`https://discord.com/channels/${process.env.DISCORD_GUILD_ID}`);
    }

    // --- Yearly Pro Discord bonus flow ---
    if (isYearlyBonusFlow) {
      const { addToGuild: addToGuildFn, addRole: addRoleFn } = await import("@/lib/discord");

      await addToGuildFn(discordUser.id, tokenData.access_token);
      await addRoleFn(discordUser.id);

      // Set trial expiry to 30 days from now
      await prisma.user.update({
        where: { discordId: discordUser.id },
        data: {
          discordTrialExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      return NextResponse.redirect(`https://discord.com/channels/${process.env.DISCORD_GUILD_ID}`);
    }

    // --- Bundle Discord → Checkout flow ---
    if (isBundleFlow) {
      // Already-subscribed user: skip checkout, send to roadmap
      if (user.subscriptionStatus === "active") {
        await createSession(
          {
            discordId: discordUser.id,
            discordUsername: discordUser.global_name || discordUser.username,
            discordAvatar: discordUser.avatar,
          },
          "7d"
        );
        return NextResponse.redirect(`${APP_URL}/app-sprint/roadmap`);
      }

      await createSession({
        discordId: discordUser.id,
        discordUsername: discordUser.global_name || discordUser.username,
        discordAvatar: discordUser.avatar,
      });

      if (bundleFlow === "bundle-aso") {
        return NextResponse.redirect(`${APP_URL}/api/aso/checkout-bundle`);
      }
      return NextResponse.redirect(`${APP_URL}/api/checkout/bundle`);
    }

    // --- Standard flows ---
    const WHITELISTED_DISCORD_IDS = new Set([
      process.env.ADMIN_DISCORD_ID,
      "372167828964376577",
      "1295748700429357148",
    ]);
    const isWhitelisted = WHITELISTED_DISCORD_IDS.has(discordUser.id);

    if (isRoadmapRedirect) {
      // Check subscription, PremiumUser, or whitelist
      const premiumUser = await prisma.premiumUser.findUnique({
        where: { discordId: discordUser.id },
      });

      if (user.subscriptionStatus !== "active" && !premiumUser && !isWhitelisted) {
        return NextResponse.redirect(
          `${APP_URL}/app-sprint-community?error=not_subscribed`
        );
      }

      await createSession(
        {
          discordId: discordUser.id,
          discordUsername: discordUser.global_name || discordUser.username,
          discordAvatar: discordUser.avatar,
        },
        "7d"
      );

      return NextResponse.redirect(`${APP_URL}/app-sprint/${redirectTarget}`);
    }

    // Already-subscribed user: create session and send to roadmap
    if (user.subscriptionStatus === "active" && !isWhitelisted) {
      await createSession(
        {
          discordId: discordUser.id,
          discordUsername: discordUser.global_name || discordUser.username,
          discordAvatar: discordUser.avatar,
        },
        "7d"
      );
      return NextResponse.redirect(`${APP_URL}/app-sprint/roadmap`);
    }

    // Set session cookie with Discord identity for checkout
    await createSession({
      discordId: discordUser.id,
      discordUsername: discordUser.global_name || discordUser.username,
      discordAvatar: discordUser.avatar,
    });

    // Redirect to Stripe checkout
    return NextResponse.redirect(`${APP_URL}/api/checkout`);
  } catch (err) {
    console.error("Discord callback error:", err);
    return NextResponse.redirect(`${APP_URL}/app-sprint-community?error=auth_failed`);
  }
}
