import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getMobileAppById, type MobileAppAnalytics } from "@/lib/mobile-app-analytics";

export const dynamic = "force-dynamic";

const APP_IDS = new Set<MobileAppAnalytics["id"]>(["glow", "poky", "versy"]);

async function isAuthorized() {
  if (process.env.NODE_ENV === "development") return true;
  const session = await getSession();
  return session?.discordId === process.env.ADMIN_DISCORD_ID;
}

/** Month-window A/B tests, loaded after the app page so they don't block it. */
export async function GET(request: NextRequest) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appId = request.nextUrl.searchParams.get("appId")?.trim() ?? "";
  if (!APP_IDS.has(appId as MobileAppAnalytics["id"])) {
    return NextResponse.json({ error: "Invalid appId" }, { status: 400 });
  }

  try {
    const app = await getMobileAppById("month", appId as MobileAppAnalytics["id"]);
    return NextResponse.json({
      experiments: app.experiments,
      countries: app.countries,
      nativePaywalls: app.nativePaywalls ?? null,
      journalPractice: app.journalPractice ?? null,
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
