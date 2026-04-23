import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const STATE_COOKIE = "discord_oauth_state";
const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET(request: NextRequest) {
  const redirect = request.nextUrl.searchParams.get("redirect");
  const invite = request.nextUrl.searchParams.get("invite");
  const flow = request.nextUrl.searchParams.get("flow");

  // Generate CSRF state as a signed JWT, encoding the redirect target
  const claims: Record<string, unknown> = {};
  if (redirect?.startsWith("learn")) {
    claims.redirect = redirect;
  }
  if (flow === "bundle-community" || flow === "bundle-aso" || flow === "aso-yearly-bonus" || flow === "community" || flow === "community-starter") {
    claims.flow = flow;
  }

  // Validate invite token if provided
  if (invite) {
    const inviteLink = await prisma.inviteLink.findUnique({
      where: { token: invite },
    });
    if (!inviteLink || inviteLink.usedAt) {
      return NextResponse.redirect(`${APP_URL}/invite/invalid`);
    }
    claims.invite = invite;
  }

  const state = await new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 300, // 5 minutes
  });

  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    redirect_uri: `${APP_URL}/api/auth/discord/callback`,
    response_type: "code",
    scope: "identify guilds.join",
    state,
  });

  return NextResponse.redirect(
    `https://discord.com/api/oauth2/authorize?${params.toString()}`
  );
}
