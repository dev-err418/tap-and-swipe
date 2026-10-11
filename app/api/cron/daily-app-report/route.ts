import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getDailyMobileAppReport } from "@/lib/mobile-app-analytics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const reply = (body: object, status = 200) => NextResponse.json(body, {
    status, headers: { "Cache-Control": "private, no-store" },
  });
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret ?? ""}`);
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return reply({ error: "Unauthorized" }, 401);
  const body = await request.json().catch(() => null);
  if (!body || !["glow", "versy", "poky"].includes(body.appId)
    || !Number.isSafeInteger(body.endMs) || body.endMs > Date.now()
    || body.endMs < Date.now() - 48 * 3_600_000) return reply({ error: "Invalid report window" }, 400);
  try {
    return reply(await getDailyMobileAppReport(body.appId, body.endMs));
  } catch {
    console.error("daily_app_report_failed", { appId: body.appId });
    return reply({ error: "Daily app data unavailable" }, 502);
  }
}
