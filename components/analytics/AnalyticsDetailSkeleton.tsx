import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AnalyticsPeriodSelect from "@/components/analytics/AnalyticsPeriodSelect";
import { analyticsPeriodSummary } from "@/components/analytics/AnalyticsDirectorySkeleton";
import { DASHBOARD_SURFACE_CLASS } from "@/components/analytics/dashboard-surface";
import { WebsiteFavicon } from "@/components/analytics/website-summary-card";

type Period = "day" | "yesterday" | "3days" | "week" | "month" | "all";
type AppId = "glow" | "poky" | "versy";
type WebsiteSite = "appsprint" | "postback" | "grewit" | "community";

const APPS: Record<AppId, { name: string; iconUrl: string }> = {
  poky: {
    name: "Poky",
    iconUrl: "https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/5e/46/3f/5e463fde-45e6-7fdc-ce5a-bb5b73af405d/AppIcon-0-0-1x_U007ephone-0-1-sRGB-85-220.png/512x512bb.jpg",
  },
  glow: {
    name: "Glow",
    iconUrl: "https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/19/20/0e/19200e98-f11f-8ab4-850a-81a2a45122e0/AppIcon-0-0-1x_U007ephone-0-1-0-sRGB-85-220.png/512x512bb.jpg",
  },
  versy: { name: "Versy", iconUrl: "/community-icons/versy.png" },
};

const SITES: Record<WebsiteSite, string> = {
  appsprint: "appsprint.app",
  community: "community",
  postback: "postback.sh",
  grewit: "grewit.app",
};

export function AnalyticsDetailSkeleton({
  period,
  app,
  site,
}: {
  period: Period;
  app?: AppId;
  site?: WebsiteSite;
}) {
  const periodLabel = analyticsPeriodSummary(period);
  const backLabel = app ? "All apps" : "All websites";
  const name = app ? APPS[app].name : site ? SITES[site] : "";

  return (
    <div className="space-y-10" aria-busy="true" aria-label={`Loading ${name}`}>
      <div className="space-y-5">
        <Link
          href={period === "week" ? "/analytics" : `/analytics?period=${period}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-medium text-black/60 shadow-none ring-0 transition-all hover:text-black active:translate-y-px"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {app ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={APPS[app].iconUrl} alt="" width={40} height={40} className="size-10 shrink-0 rounded-[10px]" />
            ) : site ? (
              <WebsiteFavicon domain={SITES[site]} size="large" />
            ) : null}
            <h1 className="min-w-0 text-lg font-normal text-black/55 sm:text-xl">
              <strong className="font-semibold text-black">{name}</strong> got <MetricBone />{" "}
              {app ? "installs" : "visitors"} and <MetricBone wide /> {app ? "proceeds" : "revenue"} {periodLabel}.
            </h1>
          </div>
          <AnalyticsPeriodSelect period={period} app={app} site={site} />
        </div>
      </div>
      <div className={`h-[28rem] motion-safe:animate-pulse ${DASHBOARD_SURFACE_CLASS}`} />
    </div>
  );
}

function MetricBone({ wide = false }: { wide?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-[1.05em] translate-y-[0.12em] rounded bg-black/10 align-middle motion-safe:animate-pulse ${wide ? "w-16" : "w-12"}`}
    />
  );
}
