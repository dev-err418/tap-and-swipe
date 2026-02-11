import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { exchangeCode, getUser } from "@/lib/discord";
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
    return NextResponse.redirect(`${APP_URL}/app-sprint?error=oauth_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/app-sprint?error=missing_params`);
  }

  // Verify CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${APP_URL}/app-sprint?error=invalid_state`);
  }

  try {
    await jwtVerify(savedState, SECRET);
  } catch {
    return NextResponse.redirect(`${APP_URL}/app-sprint?error=expired_state`);
  }

  try {
    // Exchange code for access token
    const redirectUri = `${APP_URL}/api/auth/discord/callback`;
    const tokenData = await exchangeCode(code, redirectUri);

    // Fetch Discord user profile
    const discordUser = await getUser(tokenData.access_token);

    // Upsert user in database
    const user = await prisma.user.upsert({
      where: { discordId: discordUser.id },
      update: {
        discordUsername: discordUser.global_name || discordUser.username,
        discordAvatar: discordUser.avatar,
      },
      create: {
        discordId: discordUser.id,
        discordUsername: discordUser.global_name || discordUser.username,
        discordAvatar: discordUser.avatar,
      },
    });

    // Fire DataFast goal for Discord auth completion
    const datafastVisitorId = cookieStore.get("datafast_visitor_id")?.value;
    if (datafastVisitorId && process.env.DATAFAST_API_KEY) {
      fetch("https://datafa.st/api/v1/goals", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.DATAFAST_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          datafast_visitor_id: datafastVisitorId,
          name: "discord_auth_completed",
        }),
      }).catch(() => {}); // fire-and-forget, don't block auth flow
    }

    // If already actively subscribed, skip checkout
    if (user.subscriptionStatus === "active") {
      return NextResponse.redirect(
        `${APP_URL}/app-sprint?status=already_subscribed`
      );
    }

    // Set session cookie with Discord identity for checkout
    await createSession({
      discordId: discordUser.id,
      discordUsername: discordUser.global_name || discordUser.username,
      discordAvatar: discordUser.avatar,
    });

    // Redirect to checkout
    return NextResponse.redirect(`${APP_URL}/api/checkout`);
  } catch (err) {
    console.error("Discord callback error:", err);
    return NextResponse.redirect(`${APP_URL}/app-sprint?error=auth_failed`);
  }
}
