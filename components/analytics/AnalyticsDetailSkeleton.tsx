import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AnalyticsPeriodSelect from "@/components/analytics/AnalyticsPeriodSelect";
import { analyticsPeriodSummary } from "@/components/analytics/AnalyticsDirectorySkeleton";
import { APP_ANALYTICS_HEADER_CLASS, DASHBOARD_SURFACE_CLASS, DASHBOARD_TAB_LIST_CLASS, DASHBOARD_TAB_CLASS, DASHBOARD_TAB_ACTIVE_CLASS } from "@/components/analytics/dashboard-surface";
import { WebsiteFavicon } from "@/components/analytics/website-summary-card";
import { DashboardCard } from "./DashboardCard";
import { experimentCohortLabel } from "@/lib/app-experiment-cohort";
import { cn } from "@/lib/utils";

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
    iconUrl: "/community-icons/glow-wordmark.png",
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
    <div className="w-full min-w-0 space-y-10" aria-busy="true" aria-label={`Loading ${name}`}>
      <div className="w-full min-w-0 space-y-5">
        <Link
          href={period === "week" ? "/analytics" : `/analytics?period=${period}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-medium text-black/60 shadow-none ring-0 transition-all hover:text-black active:translate-y-px"
        >
          <ArrowLeft className="size-4" />
          {backLabel}
        </Link>
        {!app ? <div className="flex w-full min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {site ? (
              <WebsiteFavicon domain={SITES[site]} size="large" />
            ) : null}
            <h1 className="min-w-0 text-lg font-normal text-black/55 sm:text-xl">
              <strong className="font-semibold text-black">{name}</strong> got <MetricBone /> visitors and <MetricBone wide /> revenue {periodLabel}.
            </h1>
          </div>
          <AnalyticsPeriodSelect period={period} app={app} site={site} />
        </div> : null}
      </div>
      {app ? <AppOverviewSkeleton app={app} period={period} /> : <div className={`h-[28rem] w-full min-w-0 ${DASHBOARD_SURFACE_CLASS}`} />}
    </div>
  );
}

function AppOverviewSkeleton({ app, period }: { app: AppId; period: Period }) {
  const metrics = ["Tracked installs", "APPU", "Conversion to paid"];
  const cohortLabel = experimentCohortLabel(app)!;
  return (
    <section className="w-full min-w-0 space-y-4">
      <div className={APP_ANALYTICS_HEADER_CLASS}>
        <div className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={APPS[app].iconUrl} alt="" width={40} height={40} className="size-10 shrink-0 rounded-[10px]" />
          <h1 className="min-w-0 text-lg font-semibold text-black sm:text-xl">{APPS[app].name}</h1>
        </div>
        <div className="flex min-w-0 overflow-x-auto scrollbar-none" aria-hidden="true">
          <div className={`${DASHBOARD_TAB_LIST_CLASS} mx-auto shrink-0`}>
            <span className={`${DASHBOARD_TAB_CLASS} ${DASHBOARD_TAB_ACTIVE_CLASS} inline-flex items-center whitespace-nowrap px-3`}>🌍 All countries</span>
            {Array.from({ length: 3 }, (_, index) => <span key={index} className="flex h-[26px] w-20 items-center gap-1.5 px-2"><Bone className="size-3.5 shrink-0 rounded-full" /><Bone className="w-10" /></span>)}
          </div>
        </div>
        <div className="sm:justify-self-end"><AnalyticsPeriodSelect period={period} app={app} /></div>
      </div>
      <div className="w-full min-w-0 max-w-full overflow-x-auto rounded-[28px] border-0 bg-white shadow-none">
        <div className="min-w-0 border-b border-black/[0.08]">
          <div className="grid grid-cols-3 divide-x divide-black/[0.08]">
            {metrics.map((label) => (
              <div key={label} className="min-w-0 px-4 py-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 h-8"><MetricBone wide /></p>
                <p className="mt-1 h-4"><MetricBone /></p>
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-0 p-4 sm:p-6">
          <div className="mb-3 flex h-8 items-center justify-between" aria-hidden><Bone className="w-16" /><Bone className="h-8 w-20 rounded-full" /></div>
          <div aria-hidden className="h-80 w-full rounded-xl bg-black/[0.04] motion-safe:animate-pulse sm:h-96" />
        </div>
      </div>
      <div className="space-y-4">
        <VersionTableSkeleton app={app} />
        <ComparisonTableSkeleton title="User journey" rows={app === "glow" ? 2 : app === "poky" ? 4 : 3} rowHeading="Onboarding funnel" cohortLabel={cohortLabel} />
        {app !== "versy" ? <ComparisonTableSkeleton title="Paywall flows" rows={app === "poky" ? 4 : 2} rowHeading="Paywall flow" cohortLabel={cohortLabel} /> : null}
        {app !== "poky" ? <ComparisonTableSkeleton title="Yearly prices" rows={app === "glow" ? 6 : 4} rowHeading="Price" cohortLabel={cohortLabel} /> : null}
        {app === "glow" ? <ComparisonTableSkeleton title="Paywall flow × yearly price" rows={12} rowHeading="Flow × price" cohortLabel={cohortLabel} /> : null}
        {app !== "poky" ? <DashboardCard title="Trial survival · 7-day trials" action={<span className="text-xs text-muted-foreground">{cohortLabel}</span>}>
          <div aria-hidden="true" className="mb-4 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }, (_, index) => <div key={index} className="space-y-2"><Bone className="w-24" /><Bone className="h-6 w-12" /><Bone className="w-20" /></div>)}
          </div>
          <Bone className="h-64 w-full rounded-xl" />
          <Bone className="mt-3 w-3/4" />
        </DashboardCard> : null}
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          {["APPU", "Downloads → Paid"].map((title) => <DashboardCard key={title} title={title}
            action={<span className="text-xs text-muted-foreground">Last 30 days</span>} contentClassName="h-[24.5rem] space-y-1 p-0">
            {Array.from({ length: 10 }, (_, index) => <div key={index} aria-hidden="true" className="flex h-8 items-center gap-2 px-3"><Bone className="size-5 shrink-0 rounded-full" /><Bone className="h-5 flex-1" /><Bone className="w-12" /></div>)}
          </DashboardCard>)}
        </div>
      </div>
    </section>
  );
}

function VersionTableSkeleton({ app }: { app: AppId }) {
  const audiences = app === "poky" ? ["All users", "Ads", "Non-ads"] : ["All users", "Meta Ads", "ASA", "Organic"];
  const fields = ["Installs", "APPU", "Trial start", "Trial → paid", ...(app === "poky" ? ["Install → paid"] : [])];
  return <DashboardCard title="App versions" contentClassName="pt-0">
    <div className="overflow-x-auto rounded-xl border border-black/[0.06] scrollbar-none" aria-hidden="true">
      <table className="w-full min-w-max text-left text-xs">
        <thead className="bg-[#f8f8f8] text-muted-foreground">
          <tr><th rowSpan={2} className="min-w-32 px-4 py-3 font-medium text-foreground">First version</th>{audiences.map((audience) => <th key={audience} colSpan={fields.length} className="border-l border-black/[0.06] px-3 py-3 font-medium">{audience}</th>)}</tr>
          <tr>{audiences.flatMap((audience) => fields.map((field) => <th key={`${audience}:${field}`} className="min-w-28 px-3 py-3 text-right font-medium">{field}</th>))}</tr>
        </thead>
        <tbody>{Array.from({ length: 4 }, (_, index) => <tr key={index} className="border-t border-black/[0.06]"><td className="px-4 py-2"><Bone className="w-16" /></td>{audiences.flatMap((audience) => fields.map((field) => <td key={`${audience}:${field}`} className="px-3 py-2"><Bone className="ml-auto h-4 w-12" /></td>))}</tr>)}</tbody>
      </table>
    </div>
  </DashboardCard>;
}

function ComparisonTableSkeleton({ title, rows, rowHeading, cohortLabel }: { title: string; rows: number; rowHeading: string; cohortLabel: string }) {
  const fields = ["Installs", "APPU lift", "Win %", "APPU", "Trial start", "Trial → paid", "Install → paid", "Refund rate"];
  return <DashboardCard title={title} titleAccessory={<span aria-hidden="true" className="m-0.5 size-5 rounded-full border-[3px] border-black/[0.06] motion-safe:animate-pulse" />} action={<span className="text-xs text-muted-foreground">{cohortLabel}</span>} contentClassName="pt-0">
    <div className="overflow-x-auto rounded-xl border border-black/[0.06] scrollbar-none" aria-hidden="true">
      <table className="w-full min-w-[1348px] text-left text-xs">
        <thead className="bg-[#f8f8f8] text-muted-foreground"><tr><th className="min-w-32 px-4 py-3 font-medium text-foreground">{rowHeading}</th>{fields.map((field) => <th key={field} className={`${field === "APPU lift" ? "min-w-[460px]" : "min-w-24"} whitespace-nowrap px-3 py-3 text-right font-medium`}>{field}</th>)}</tr></thead>
        <tbody>{Array.from({ length: rows }, (_, index) => <tr key={index} className="border-t border-black/[0.06]"><td className="px-4 py-2"><Bone className="w-24" /></td>{fields.map((field) => <td key={field} className="px-3 py-2"><Bone className={`ml-auto h-6 ${field === "APPU lift" ? "w-full" : "w-12"}`} /></td>)}</tr>)}</tbody>
      </table>
    </div>
  </DashboardCard>;
}

function Bone({ className }: { className: string }) {
  return <span aria-hidden="true" className={cn("block h-3 rounded bg-black/[0.06] motion-safe:animate-pulse", className)} />;
}

function MetricBone({ wide = false }: { wide?: boolean }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-[1.05em] translate-y-[0.12em] rounded bg-black/10 align-middle motion-safe:animate-pulse ${wide ? "w-16" : "w-12"}`}
    />
  );
}
