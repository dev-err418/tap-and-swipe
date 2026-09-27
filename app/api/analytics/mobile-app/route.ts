import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getMobileAppById, type MobileAppAnalytics } from "@/lib/mobile-app-analytics";
import { versionParts } from "@/lib/app-version-comparison";

export const dynamic = "force-dynamic";

const APP_IDS = new Set<MobileAppAnalytics["id"]>(["glow", "poky", "versy"]);
const PERIODS = new Set(["day", "yesterday", "3days", "week", "month", "all"]);

async function isAuthorized() {
  if (process.env.NODE_ENV === "development") return true;
  const session = await getSession();
  return session?.discordId === process.env.ADMIN_DISCORD_ID;
}

/** Month-window A/B tests and optional version-cohort comparisons. */
export async function GET(request: NextRequest) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appId = request.nextUrl.searchParams.get("appId")?.trim() ?? "";
  if (!APP_IDS.has(appId as MobileAppAnalytics["id"])) {
    return NextResponse.json({ error: "Invalid appId" }, { status: 400 });
  }

  const compareVersion = request.nextUrl.searchParams.get("compareVersion")?.trim();
  const period = request.nextUrl.searchParams.get("period")?.trim() ?? "month";
  if (!PERIODS.has(period) || (compareVersion && !versionParts(compareVersion))) {
    return NextResponse.json({ error: "Invalid comparison" }, { status: 400 });
  }

  try {
    const app = await getMobileAppById(compareVersion ? period as "day" | "yesterday" | "3days" | "week" | "month" | "all" : "month", appId as MobileAppAnalytics["id"], compareVersion ? { compareVersion, sessions: period === "month" } : undefined);
    if (compareVersion) {
      const month = period === "month" ? app : await getMobileAppById("month", appId as MobileAppAnalytics["id"], { compareVersion });
      return NextResponse.json({
        comparison: app.versionComparison ?? null,
        monthComparison: month.versionComparison ?? null,
        appVersions: month.appVersions ?? [],
      });
    }
    return NextResponse.json({
      experiments: app.experiments,
      countries: app.countries,
      nativePaywalls: app.nativePaywalls ?? null,
      journalPractice: app.journalPractice ?? null,
      appVersions: app.appVersions ?? [],
    });
  } catch (error) {
    const log = process.env.NODE_ENV === "development" ? console.warn : console.error;
    log("tap_and_swipe.mobile_app_experiments_failed", {
      appId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "App experiments failed to load" }, { status: 500 });
  }
}
