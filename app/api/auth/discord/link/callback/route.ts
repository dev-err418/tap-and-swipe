import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { exchangeCode, getUser, addToGuild, addRole } from "@/lib/discord";
import { prisma } from "@/lib/prisma";

const STATE_COOKIE = "discord_link_state";
const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${APP_URL}/learn/community?discord=denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/learn/community?discord=error`);
  }

  // Verify CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${APP_URL}/learn/community?discord=error`);
  }

  let userId: string;
  try {
    const { payload } = await jwtVerify(savedState, SECRET);
    userId = payload.userId as string;
  } catch {
    return NextResponse.redirect(`${APP_URL}/learn/community?discord=error`);
  }

  try {
    const redirectUri = `${APP_URL}/api/auth/discord/link/callback`;
    const tokenData = await exchangeCode(code, redirectUri);
    const discordUser = await getUser(tokenData.access_token);

    // Update user with Discord info
    await prisma.user.update({
      where: { id: userId },
      data: {
        discordId: discordUser.id,
        discordUsername: discordUser.global_name || discordUser.username,
        discordAvatar: discordUser.avatar,
        discordAccessToken: tokenData.access_token,
      },
    });

    // Add to guild and assign role
    await addToGuild(discordUser.id, tokenData.access_token).catch((err) =>
      console.warn(`[discord-link] addToGuild failed for ${discordUser.id}:`, err)
    );

    const roleGranted = await addRole(discordUser.id);
    if (roleGranted) {
      await prisma.user.update({
        where: { id: userId },
        data: { roleGranted: true },
      });
    }

    return NextResponse.redirect(`${APP_URL}/learn/community?discord=connected`);
  } catch (err) {
    console.error("[discord-link] Callback error:", err);
    return NextResponse.redirect(`${APP_URL}/learn/community?discord=error`);
  }
}
