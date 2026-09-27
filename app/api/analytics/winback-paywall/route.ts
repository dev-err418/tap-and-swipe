import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getWinbackPaywallReport } from "@/lib/winback-paywall-queries";
import { versionParts } from "@/lib/app-version-comparison";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    const session = await getSession();
    if (!session || !process.env.ADMIN_DISCORD_ID || session.discordId !== process.env.ADMIN_DISCORD_ID) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const appId = request.nextUrl.searchParams.get("appId");
  if (appId !== "glow" && appId !== "versy") return NextResponse.json({ error: "Invalid appId" }, { status: 400 });
  const compareVersion = request.nextUrl.searchParams.get("compareVersion")?.trim();
  if (compareVersion && !versionParts(compareVersion)) return NextResponse.json({ error: "Invalid version" }, { status: 400 });
  return NextResponse.json(await getWinbackPaywallReport(appId, compareVersion), { headers: { "Cache-Control": "private, no-store" } });
}
