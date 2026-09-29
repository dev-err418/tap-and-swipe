import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getVersyPaywallPlacements } from "@/lib/versy-paywall-placement-queries";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    const session = await getSession();
    if (!session || !process.env.ADMIN_DISCORD_ID || session.discordId !== process.env.ADMIN_DISCORD_ID) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return NextResponse.json(await getVersyPaywallPlacements(), { headers: { "Cache-Control": "private, no-store" } });
}
