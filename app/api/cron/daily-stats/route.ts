import { NextRequest, NextResponse } from "next/server";
import { computeDailyStats } from "@/lib/compute-daily-stats";
import { sendRevenueCatEmbed } from "@/lib/revenuecat-discord";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const messages = await computeDailyStats();
    for (const embeds of messages) {
      await sendRevenueCatEmbed(embeds);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Daily stats cron error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
