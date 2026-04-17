import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendPush } from "@/lib/apns";

const DAILY_TARGET = 5;

export async function GET(request: NextRequest) {
  const secret = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Start of today in CEST (UTC+2)
  const now = new Date();
  const cestOffset = 2 * 60 * 60 * 1000;
  const cestNow = new Date(now.getTime() + cestOffset);
  const startOfDayCEST = new Date(
    Date.UTC(cestNow.getUTCFullYear(), cestNow.getUTCMonth(), cestNow.getUTCDate())
  );
  const startUtc = new Date(startOfDayCEST.getTime() - cestOffset);

  const { count, error } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startUtc.toISOString());

  if (error) {
    console.error("[lead-reminders] Count failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const todayCount = count ?? 0;

  if (todayCount < DAILY_TARGET) {
    const remaining = DAILY_TARGET - todayCount;
    try {
      await sendPush(
        "\u{1F3AF} Lead Reminder",
        `Only ${todayCount} lead${todayCount === 1 ? "" : "s"} today. ${remaining} more to hit your target of ${DAILY_TARGET}.`
      );
    } catch (err) {
      console.error("[lead-reminders] Push failed:", err);
      return NextResponse.json(
        { todayCount, error: "Push notification failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ todayCount, target: DAILY_TARGET, sent: todayCount < DAILY_TARGET });
}
