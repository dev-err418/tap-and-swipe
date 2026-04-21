import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";

const STATE_COOKIE = "discord_link_state";
const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(`${APP_URL}/login?callbackUrl=/learn/community`);
  }

  // Generate CSRF state as a signed JWT with userId
  const state = await new SignJWT({ userId: session.user.id })
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
    maxAge: 300,
  });

  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    redirect_uri: `${APP_URL}/api/auth/discord/link/callback`,
    response_type: "code",
    scope: "identify guilds.join",
    state,
  });

  return NextResponse.redirect(
    `https://discord.com/api/oauth2/authorize?${params.toString()}`
  );
}
