import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsViewer } from "@/lib/analytics-session";
import { canAccessAnalyticsApp } from "@/lib/analytics-access";
import { getMobileAppById, type MobileAppAnalytics } from "@/lib/mobile-app-analytics";

export const dynamic = "force-dynamic";

const APP_IDS = new Set<MobileAppAnalytics["id"]>(["glow", "poky", "versy"]);

/** Month-window A/B tests and paywall analytics. */
export async function GET(request: NextRequest) {
  const access = await getAnalyticsViewer();
  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appId = request.nextUrl.searchParams.get("appId")?.trim() ?? "";
  if (!APP_IDS.has(appId as MobileAppAnalytics["id"])) {
    return NextResponse.json({ error: "Invalid appId" }, { status: 400 });
  }
  if (!canAccessAnalyticsApp(access, appId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const app = await getMobileAppById("month", appId as MobileAppAnalytics["id"]);
    return NextResponse.json({
      experiments: app.experiments,
      countries: app.countries,
      nativePaywalls: app.nativePaywalls ?? null,
      onboardingExperience: app.onboardingExperience ?? null,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const log = process.env.NODE_ENV === "development" ? console.warn : console.error;
    log("tap_and_swipe.mobile_app_experiments_failed", {
      appId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "App experiments failed to load" }, { status: 500 });
  }
}
