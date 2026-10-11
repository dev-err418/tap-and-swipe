import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { analyticsSnapshotDirectory, refreshAnalyticsSnapshots } from "@/lib/analytics-snapshot";
import { parseAnalyticsRefreshJob } from "@/lib/analytics-refresh-jobs";
import { getMobileAppById } from "@/lib/mobile-app-analytics";
import { getGlowProductReport } from "@/lib/glow-product-queries";
import { getVersyProductReport } from "@/lib/versy-product-queries";
import { getWinbackPaywallReport } from "@/lib/winback-paywall-queries";
import { getVersyPaywallPlacements } from "@/lib/versy-paywall-placement-queries";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** One bounded report per request. The scheduler spreads jobs across apps. */
export async function POST(request: NextRequest) {
  const reply = (body: object, status = 200) => NextResponse.json(body, {
    status, headers: { "Cache-Control": "private, no-store" },
  });
  if (!authorized(request)) return reply({ error: "Unauthorized" }, 401);
  if (!analyticsSnapshotDirectory()) return reply({ error: "ANALYTICS_SNAPSHOT_DIR must point to a persistent private volume" }, 503);
  const job = parseAnalyticsRefreshJob(await request.json().catch(() => null));
  if (!job) return reply({ error: "Invalid analytics refresh job" }, 400);
  try {
    const report = await refreshAnalyticsSnapshots(async () => {
      if (job.kind === "data") return getMobileAppById(job.period, job.appId, { sessions: false, includeReports: false });
      if (job.kind === "experiments") return getMobileAppById("month", job.appId);
      if (job.kind === "product") return job.appId === "glow" ? getGlowProductReport(job.period) : getVersyProductReport(job.period);
      if (job.kind === "winback") return getWinbackPaywallReport(job.appId as "glow" | "versy");
      return getVersyPaywallPlacements();
    });
    // Setup-required loaders may return before reaching the snapshot layer.
    if (!("snapshotUpdatedAt" in report) || !report.snapshotUpdatedAt) throw new Error("No complete snapshot was saved");
    return reply({ ...job, updatedAt: report.snapshotUpdatedAt });
  } catch (error) {
    console.error("analytics_refresh_failed", { ...job, error: error instanceof Error ? error.message : String(error) });
    return reply({ ...job, error: "Refresh failed; previous snapshot retained" }, 502);
  }
}
