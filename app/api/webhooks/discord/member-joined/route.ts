import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { findActiveMembershipByDiscordId, tierFromWhopPlanId } from "@/lib/whop";
import { grantAccess } from "@/lib/grant-access";

export const runtime = "nodejs";

function verifySignature(body: string, signatureHeader: string | null): boolean {
  const secret = process.env.DISCORD_BOT_SHARED_SECRET;
  if (!secret) {
    console.error("[discord/member-joined] DISCORD_BOT_SHARED_SECRET not set");
    return false;
  }
  if (!signatureHeader) return false;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const provided = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice("sha256=".length)
    : signatureHeader;
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const signature = request.headers.get("x-bot-signature");

  if (!verifySignature(bodyText, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { discordId?: string; username?: string };
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const discordId = typeof payload.discordId === "string" ? payload.discordId : "";
  const incomingUsername =
    typeof payload.username === "string" && payload.username.length > 0
      ? payload.username
      : null;

  if (!discordId) {
    return NextResponse.json({ error: "Missing discordId" }, { status: 400 });
  }

  // Skip if we've already granted this user — bot may re-fire on relogin
  const existing = await prisma.user.findUnique({
    where: { discordId },
    select: { roleGranted: true, subscriptionStatus: true },
  });
  if (existing?.roleGranted && existing.subscriptionStatus === "active") {
    return NextResponse.json({ status: "already_granted" });
  }

  // Look up the matching active Whop membership
  const match = await findActiveMembershipByDiscordId(discordId);
  if (!match) {
    console.log(
      `[discord/member-joined] no active Whop membership for discordId=${discordId} (likely free joiner)`
    );
    return NextResponse.json({ status: "no_membership" });
  }

  const tier = tierFromWhopPlanId(match.planId);

  const result = await grantAccess({
    discordId: match.discord.id,
    discordUsername: incomingUsername ?? match.discord.username,
    tier,
    email: match.email ?? undefined,
    whopMembershipId: match.membershipId,
    manageUrl: match.manageUrl ?? undefined,
    source: "discord-join",
  });

  return NextResponse.json({ status: "granted", ...result });
}
