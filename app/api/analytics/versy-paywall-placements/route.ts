import { NextResponse } from "next/server";
import { getAnalyticsViewer } from "@/lib/analytics-session";
import { getVersyPaywallPlacements } from "@/lib/versy-paywall-placement-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const access = await getAnalyticsViewer();
  if (!access?.canManage) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getVersyPaywallPlacements(), { headers: { "Cache-Control": "private, no-store" } });
}
