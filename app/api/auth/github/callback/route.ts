import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { exchangeCode, getUser, inviteToOrg, addToTeam } from "@/lib/github";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const STATE_COOKIE = "github_oauth_state";
const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const BUILD_URL = `${APP_URL}/learn/build-with-boilerplate`;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${BUILD_URL}?github_status=error`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${BUILD_URL}?github_status=error`);
  }

  // Verify CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${BUILD_URL}?github_status=error`);
  }

  try {
    await jwtVerify(savedState, SECRET);
  } catch {
    return NextResponse.redirect(`${BUILD_URL}?github_status=error`);
  }

  // Must be logged in (have a Discord session)
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(`${BUILD_URL}?github_status=error`);
  }

  try {
    const tokenData = await exchangeCode(code);
    const githubUser = await getUser(tokenData.access_token);

    // Update user record with GitHub info
    await prisma.user.update({
      where: { discordId: session.discordId },
      data: {
        githubId: String(githubUser.id),
        githubUsername: githubUser.login,
        githubConnectedAt: new Date(),
      },
    });

    // Invite to org and add to team
    const inviteStatus = await inviteToOrg(githubUser.login);
    await addToTeam(githubUser.login);

    return NextResponse.redirect(`${BUILD_URL}?github_status=${inviteStatus}`);
  } catch (err) {
    console.error("GitHub callback error:", err);
    return NextResponse.redirect(`${BUILD_URL}?github_status=error`);
  }
}
