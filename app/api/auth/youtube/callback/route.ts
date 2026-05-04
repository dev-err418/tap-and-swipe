import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getOAuthClient } from "@/lib/youtube";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (session?.discordId !== process.env.ADMIN_DISCORD_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = request.nextUrl.searchParams.get("code");
  const errorParam = request.nextUrl.searchParams.get("error");
  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/learn/posting?error=${encodeURIComponent(errorParam)}`, request.url),
    );
  }
  if (!code) {
    return NextResponse.redirect(new URL("/learn/posting?error=missing_code", request.url));
  }

  const oauth = getOAuthClient();
  const { tokens } = await oauth.getToken(code);
  oauth.setCredentials(tokens);

  if (!tokens.refresh_token) {
    return NextResponse.redirect(
      new URL("/learn/posting?error=no_refresh_token", request.url),
    );
  }

  const youtube = google.youtube({ version: "v3", auth: oauth });
  const channelRes = await youtube.channels.list({ part: ["snippet"], mine: true });
  const channel = channelRes.data.items?.[0];

  await prisma.platformAccount.upsert({
    where: { platform: "youtube" },
    create: {
      platform: "youtube",
      accountId: channel?.id ?? null,
      accountName: channel?.snippet?.title ?? null,
      accessToken: tokens.access_token ?? null,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope ?? null,
    },
    update: {
      accountId: channel?.id ?? null,
      accountName: channel?.snippet?.title ?? null,
      accessToken: tokens.access_token ?? null,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      scope: tokens.scope ?? null,
    },
  });

  return NextResponse.redirect(new URL("/learn/posting?connected=youtube", request.url));
}
