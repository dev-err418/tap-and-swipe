import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getGlowProductReport, getGlowUserJourney, type GlowProductPeriod } from "@/lib/glow-product-queries";

export const dynamic = "force-dynamic";

const PERIODS = new Set<GlowProductPeriod>(["day", "yesterday", "3days", "week", "month", "all"]);

function validAgentToken(candidate: string | null): boolean {
  const expected = process.env.GLOW_ANALYTICS_AGENT_TOKEN?.trim();
  if (!expected || !candidate?.startsWith("Bearer ")) return false;
  const received = candidate.slice("Bearer ".length);
  if (!received) return false;
  return timingSafeEqual(
    createHash("sha256").update(received).digest(),
    createHash("sha256").update(expected).digest(),
  );
}

async function isAuthorized(request: NextRequest): Promise<boolean> {
  if (validAgentToken(request.headers.get("authorization"))) return true;
  if (process.env.NODE_ENV === "development") return true;
  const session = await getSession();
  return Boolean(session && process.env.ADMIN_DISCORD_ID && session.discordId === process.env.ADMIN_DISCORD_ID);
}

/** Bounded, read-only product summary for the owner dashboard and trusted agents. */
export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const period = request.nextUrl.searchParams.get("period") ?? "week";
  if (!PERIODS.has(period as GlowProductPeriod)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }
  if (request.nextUrl.searchParams.has("userId")) {
    return NextResponse.json({ error: "Use POST for a user journey" }, { status: 400 });
  }
  const report = await getGlowProductReport(period as GlowProductPeriod);
  return NextResponse.json(report, { headers: { "Cache-Control": "private, no-store" } });
}

/** Keep a Superwall user ID out of URL and proxy logs. */
export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!input || typeof input !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { period = "month", userId } = input as Record<string, unknown>;
  if (typeof period !== "string" || !PERIODS.has(period as GlowProductPeriod)) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }
  if (typeof userId !== "string" || !/^[a-zA-Z0-9_$:.-]{8,128}$/.test(userId)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }
  const journey = await getGlowUserJourney(period as GlowProductPeriod, userId);
  return NextResponse.json(journey, { headers: { "Cache-Control": "private, no-store" } });
}
