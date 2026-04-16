import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-cal-signature-256");

  if (!signature || !process.env.CALCOM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  const expected = crypto
    .createHmac("sha256", process.env.CALCOM_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (signature !== expected) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);

  if (event.triggerEvent === "BOOKING_CREATED") {
    const episodeId = event.payload?.metadata?.episode_id;
    const startTime = event.payload?.startTime;

    if (episodeId && startTime) {
      await supabase
        .from("episodes")
        .update({ recording_date: startTime })
        .eq("id", episodeId);
    }
  }

  return NextResponse.json({ ok: true });
}
