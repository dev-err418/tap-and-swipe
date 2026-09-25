"use client";

import { useSearchParams } from "next/navigation";
import AnalyticsPeriodSelect from "@/components/analytics/AnalyticsPeriodSelect";
import { AnalyticsDirectorySkeleton, analyticsPeriodSummary } from "@/components/analytics/AnalyticsDirectorySkeleton";
import { AnalyticsDetailSkeleton } from "@/components/analytics/AnalyticsDetailSkeleton";

type Period = "day" | "yesterday" | "3days" | "week" | "month" | "all";
type AppId = "glow" | "poky" | "versy";
type WebsiteSite = "appsprint" | "postback" | "grewit" | "community";

function normalizePeriod(value: string | null): Period {
  return value === "day" || value === "yesterday" || value === "3days" || value === "month" || value === "all"
    ? value
    : "week";
}

export default function AnalyticsLoading() {
  const searchParams = useSearchParams();
  const period = normalizePeriod(searchParams.get("period"));
  const app = searchParams.get("app");
  const site = searchParams.get("site");
  const appId = app === "glow" || app === "poky" || app === "versy" ? app as AppId : null;
  const siteId = site === "appsprint" || site === "postback" || site === "grewit" || site === "community"
    ? site as WebsiteSite
    : null;

  return (
    <main
      className="min-h-screen px-4 py-6 text-black sm:px-6 sm:py-8"
      aria-busy="true"
      aria-label="Loading analytics"
    >
      <div className="mx-auto max-w-6xl">
        {appId ? (
          <AnalyticsDetailSkeleton period={period} app={appId} />
        ) : siteId ? (
          <AnalyticsDetailSkeleton period={period} site={siteId} />
        ) : (
          <div className="space-y-12">
            <div className="flex justify-end">
              <AnalyticsPeriodSelect period={period} />
            </div>
            <AnalyticsDirectorySkeleton periodLabel={analyticsPeriodSummary(period)} />
          </div>
        )}
      </div>
    </main>
  );
}
