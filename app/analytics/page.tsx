import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Command,
} from "lucide-react";
import { getSession } from "@/lib/session";
import {
  getAppSprintFunnelAnalytics,
  type AppSprintFunnelAnalytics,
} from "@/lib/appsprint-funnel";
import { getPostbackFunnelAnalytics } from "@/lib/postback-funnel";
import { getGrewItFunnelAnalytics } from "@/lib/grew-it-funnel";
import { getCommunityFunnelAnalytics } from "@/lib/community-funnel";
import {
  getMobileAppSummary,
  getMobileAppById,
  type MobileAppAnalytics,
} from "@/lib/mobile-app-analytics";
import AppOverviewPanel from "@/components/analytics/AppOverviewPanel";
import GlowProductPanel from "@/components/analytics/GlowProductPanel";
import { getGlowProductReport } from "@/lib/glow-product-queries";
import { getVersyProductReport } from "@/lib/versy-product-queries";
import type { GlowProductReport } from "@/lib/glow-product-analytics";
import type { VersyProductReport } from "@/lib/versy-product-analytics";
import AnalyticsPeriodSelect from "@/components/analytics/AnalyticsPeriodSelect";
import { AnalyticsDirectorySkeleton, AppCardSkeleton, AppTotalsSkeleton, WebsiteCardSkeleton, WebsiteTotalsSkeleton } from "@/components/analytics/AnalyticsDirectorySkeleton";
import { AnalyticsDetailSkeleton } from "@/components/analytics/AnalyticsDetailSkeleton";
import DeadProjectsDisclosure from "@/components/analytics/DeadProjectsDisclosure";
import {
  formatCompactRevenue,
  ProjectExperimentBadge,
  WebsiteFavicon,
  WebsiteMiniChart,
  WebsiteSummaryCard,
  type WebsiteTrendPoint,
} from "@/components/analytics/website-summary-card";
import { DASHBOARD_SURFACE_CLASS } from "@/components/analytics/dashboard-surface";
import AppSprintFunnelPanel from "@/components/analytics/AppSprintFunnelPanel";
import LicensesModal from "@/components/aso-debug/LicensesModal";
import ProxyAnalyticsPanel from "@/components/aso-debug/ProxyAnalyticsPanel";
import ProxyHealthPanel from "@/components/aso-debug/ProxyHealthPanel";
import LicenseUsagePanel from "@/components/aso-debug/LicenseUsagePanel";
import FeedbackPanel from "@/components/aso-debug/FeedbackPanel";
import TrialAbusePanel from "@/components/aso-debug/TrialAbusePanel";
import { activeABTestCount } from "@/lib/app-experiment-map";

export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV === "development";

type Period = "day" | "yesterday" | "3days" | "week" | "month" | "all";
type Tab = "analytics" | "appsprint";
type WebsiteSite = "appsprint" | "postback" | "grewit" | "community";
type AppId = MobileAppAnalytics["id"];

const APP_PERIOD_LABELS: Record<Period, string> = {
  day: "Today",
  yesterday: "Yesterday",
  "3days": "Last 3 days",
  week: "Last 7 days",
  month: "Last 30 days",
  all: "All time",
};

const PERIOD_SUMMARY_LABELS: Record<Period, string> = {
  day: "today",
  yesterday: "yesterday",
  "3days": "in the last 3 days",
  week: "last week",
  month: "last month",
  all: "across all time",
};

const APP_DAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

type WebsiteMetricsRow = {
  visitors: number;
  revenue_cents: number;
};

function normalizeTab(value: string | undefined): Tab {
  // Keep old bookmarked ?tab=aso links working after the rename.
  return value === "appsprint" || value === "aso" ? "appsprint" : "analytics";
}

function normalizePeriod(value: string | undefined): Period {
  return value === "day" ||
    value === "yesterday" ||
    value === "3days" ||
    value === "month" ||
    value === "all"
    ? value
    : "week";
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; tab?: string; site?: string; app?: string }>;
}) {
  const session = await getSession();
  if (!isDev && !session) {
    redirect("/login");
  }
  if (!isDev && session?.discordId !== process.env.ADMIN_DISCORD_ID) {
    notFound();
  }

  const params = await searchParams;
  const tab = normalizeTab(params.tab);

  if (tab === "appsprint") {
    return <AppSprintOperations />;
  }

  const period = normalizePeriod(params.period);
  const detailApp =
    params.app === "poky" || params.app === "glow" || params.app === "versy"
      ? params.app
      : null;
  const detailSite =
    params.site === "appsprint" ||
    params.site === "postback" ||
    params.site === "grewit" ||
    params.site === "community"
      ? params.site
      : null;

  const viewKey = detailApp ? `app:${detailApp}` : detailSite ? `site:${detailSite}` : "directory";

  return (
    <main className="min-h-screen px-4 py-6 text-black sm:px-6 sm:py-8">
      <div className="mx-auto w-full min-w-0 max-w-6xl">
        <Suspense key={`${viewKey}:${period}`} fallback={
          detailApp ? (
            <AnalyticsDetailSkeleton period={period} app={detailApp} />
          ) : detailSite ? (
            <AnalyticsDetailSkeleton period={period} site={detailSite} />
          ) : (
            <div className="space-y-12">
              <div className="flex justify-end">
                <AnalyticsPeriodSelect period={period} />
              </div>
              <AnalyticsDirectorySkeleton periodLabel={PERIOD_SUMMARY_LABELS[period]} />
            </div>
          )
        }>
          {detailApp ? (
            <AppDetail period={period} appId={detailApp} />
          ) : detailSite ? (
            <WebsiteDetail period={period} site={detailSite} />
          ) : (
            <WebsiteDirectory period={period} />
          )}
        </Suspense>
      </div>
      <Link
        href="/analytics?tab=appsprint"
        aria-label="AppSprint"
        title="AppSprint"
        className="fixed right-4 bottom-4 z-50 inline-flex size-10 items-center justify-center rounded-full bg-white text-black/60 transition-colors hover:text-black"
      >
        <Command className="size-4" />
      </Link>
    </main>
  );
}

function WebsiteDirectory({
  period,
}: {
  period: Period;
}) {
  return (
    <div className="space-y-12">
      <div className="flex justify-end">
        <AnalyticsPeriodSelect period={period} />
      </div>
      <AppDirectory period={period} />
      <LiveWebsiteDirectory period={period} />
    </div>
  );
}

const APP_LOAD_ORDER = ["poky", "glow", "versy"] as const;
const funnelInflight = new Map<string, Promise<AppSprintFunnelAnalytics | null>>();

function loadWebsiteFunnel(period: Period, site: "appsprint" | "community") {
  const key = `${site}:${period}`;
  const pending = funnelInflight.get(key);
  if (pending) return pending;
  const promise = (site === "appsprint" ? getAppSprintFunnelAnalytics(period) : getCommunityFunnelAnalytics(period))
    .finally(() => funnelInflight.delete(key));
  funnelInflight.set(key, promise);
  return promise;
}



function AppDirectory({ period }: { period: Period }) {
  const periodLabel = PERIOD_SUMMARY_LABELS[period];
  return (
    <section className="space-y-6">
      <Suspense fallback={<AppTotalsSkeleton periodLabel={periodLabel} />}>
        <AppTotals period={period} />
      </Suspense>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {APP_LOAD_ORDER.map((id) => (
          <Suspense key={id} fallback={<AppCardSkeleton id={id} />}>
            <AppDirectoryCard period={period} id={id} />
          </Suspense>
        ))}
      </div>
    </section>
  );
}

async function AppTotals({ period }: { period: Period }) {
  const apps = (await Promise.all(APP_LOAD_ORDER.map((id) => getMobileAppSummary(period, id))))
    .filter((app) => app !== null);
  if (apps.length === 0) return null;
  const downloads = apps.reduce((sum, app) => sum + app.downloads, 0);
  const revenueCents = apps.reduce((sum, app) => sum + app.revenueCents, 0);
  return (
    <p className="min-w-0 text-lg text-black/55 sm:text-xl">
      Hey Arthur, you got{" "}
      <strong className="font-semibold text-black">{formatNumber(downloads)} downloads</strong>
      {" "}and{" "}
      <strong className="font-semibold text-black">{formatRevenue(revenueCents)}</strong>
      {" "}proceeds {PERIOD_SUMMARY_LABELS[period]}.
    </p>
  );
}

async function AppDirectoryCard({ period, id }: { period: Period; id: (typeof APP_LOAD_ORDER)[number] }) {
  const app = await getMobileAppSummary(period, id);
  if (!app) return null;
  return <MobileAppCard app={app} period={period} />;
}

function LiveWebsiteDirectory({ period }: { period: Period }) {
  const periodLabel = PERIOD_SUMMARY_LABELS[period];
  return (
    <section className="space-y-6">
      <Suspense fallback={<WebsiteTotalsSkeleton periodLabel={periodLabel} />}>
        <WebsiteTotals period={period} />
      </Suspense>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Suspense fallback={<WebsiteCardSkeleton domain="appsprint.app" />}>
          <WebsiteDirectoryCard period={period} site="appsprint" domain="appsprint.app" />
        </Suspense>
        <Suspense fallback={<WebsiteCardSkeleton domain="community" />}>
          <WebsiteDirectoryCard period={period} site="community" domain="community" />
        </Suspense>
      </div>
      <DeadProjectsDisclosure period={period} />
    </section>
  );
}

async function WebsiteTotals({ period }: { period: Period }) {
  const sites = await Promise.all([
    loadWebsiteFunnel(period, "appsprint"),
    loadWebsiteFunnel(period, "community"),
  ]);
  const cards = [
    sites[0] ? websiteData("appsprint", "appsprint.app", sites[0]) : null,
    sites[1] ? websiteData("community", "community", sites[1]) : null,
  ].filter((site) => site !== null);
  if (cards.length === 0) {
    return <p className="text-lg text-black/55 sm:text-xl">Website analytics could not be loaded.</p>;
  }
  const visitors = cards.reduce((sum, site) => sum + site.metrics.visitors, 0);
  const revenueCents = cards.reduce((sum, site) => sum + site.metrics.revenue_cents, 0);
  return (
    <p className="min-w-0 text-lg text-black/55 sm:text-xl">
      Hey Arthur, you got{" "}
      <strong className="font-semibold text-black">{formatNumber(visitors)} visitors</strong>
      {" "}and made{" "}
      <strong className="font-semibold text-black">{formatRevenue(revenueCents)}</strong>{" "}
      {PERIOD_SUMMARY_LABELS[period]}.
    </p>
  );
}

async function WebsiteDirectoryCard({
  period,
  site,
  domain,
}: {
  period: Period;
  site: "appsprint" | "community";
  domain: string;
}) {
  const analytics = await loadWebsiteFunnel(period, site);
  if (!analytics) return null;
  return <WebsiteSummaryCard period={period} {...websiteData(site, domain, analytics)} />;
}

function websiteData(
  site: WebsiteSite,
  domain: string,
  analytics: AppSprintFunnelAnalytics,
) {
  const daily = analytics.daily.filter((row) => row.surface === "aso");
  const interval = analytics.interval?.filter((row) => row.surface === "aso") ?? [];
  const metrics: WebsiteMetricsRow = {
    visitors: analytics.totals.asoVisits,
    revenue_cents: daily.reduce((sum, row) => sum + row.revenue, 0) * 100,
  };
  const trend: WebsiteTrendPoint[] = interval.length > 0
    ? interval.map((row) => ({
        bucket: new Date(row.bucket),
        visitors: row.visits,
        revenue: row.revenue,
      }))
    : daily.map((row) => ({
        bucket: new Date(`${row.date}T00:00:00Z`),
        visitors: row.visits,
        revenue: row.revenue,
      }));
  return { site, domain, metrics, trend, activeTests: activeWebsiteABTestCount(analytics) };
}

function activeWebsiteABTestCount(analytics: AppSprintFunnelAnalytics) {
  return [
    analytics.pricingExperiment,
    analytics.heroPreviewExperiment,
    analytics.trialExperiment,
    analytics.onboardingExperiment,
  ].filter((rows) => new Set(rows?.map((row) => row.variant) ?? []).size > 1).length;
}

function MobileAppCard({ app, period }: { app: MobileAppAnalytics; period: Period }) {
  const activeTests = activeABTestCount(app.id);
  const appu = app.downloads > 0 ? app.revenueCents / 100 / app.downloads : null;
  const points: WebsiteTrendPoint[] = app.trend.map((point) => ({
    bucket: point.bucket,
    visitors: point.downloads,
    revenue: point.revenue,
  }));

  return (
    <Link
      href={buildAnalyticsUrl({ period, app: app.id })}
      className={`relative block cursor-pointer overflow-hidden p-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black/40 ${DASHBOARD_SURFACE_CLASS}`}
    >
      <div className="pointer-events-none select-none">
        <ProjectExperimentBadge count={activeTests} />
        <div className="flex items-center gap-3 pr-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={app.iconUrl}
            alt=""
            width={24}
            height={24}
            className="size-6 shrink-0 rounded-md"
          />
          <h2 className="truncate text-xl font-semibold tracking-tight">{app.name}</h2>
        </div>

        <WebsiteMiniChart points={points} ariaLabel="New user trend line and proceeds bars" />

        <p className="text-base text-black/55">
          <strong className="font-bold text-black">{formatCompactRevenue(app.revenueCents)}</strong>{" "}
          proceeds
          <span className="mx-2 text-black/35">•</span>
          <strong className="font-bold text-black">{appu === null ? "—" : formatPreciseCurrency(appu)}</strong>{" "}
          APPU
        </p>
      </div>
    </Link>
  );
}

async function WebsiteDetail({
  period,
  site,
}: {
  period: Period;
  site: WebsiteSite;
}) {
  const analyticsPromise = getWebsiteAnalytics(site, period);
  const experimentAnalyticsPromise = period === "month"
    ? analyticsPromise
    : getWebsiteAnalytics(site, "month");
  const [analyticsResult, experimentAnalyticsResult] = await Promise.allSettled([
    analyticsPromise,
    experimentAnalyticsPromise,
  ]);
  if (analyticsResult.status === "rejected") throw analyticsResult.reason;
  const analytics = analyticsResult.value;
  const experimentAnalytics = experimentAnalyticsResult.status === "fulfilled"
    ? experimentAnalyticsResult.value
    : analytics;
  const domain = site === "appsprint"
    ? "appsprint.app"
    : site === "postback"
      ? "postback.sh"
      : site === "grewit"
        ? "grewit.app"
        : "community";
  const daily = analytics?.daily.filter((row) => row.surface === "aso") ?? [];
  const visitors = analytics?.totals.asoVisits ?? 0;
  const revenueCents = daily.reduce((sum, row) => sum + row.revenue, 0) * 100;

  return (
    <div className="space-y-10">
      <div className="space-y-5">
        <Link
          href={buildAnalyticsUrl({ period })}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-medium text-black/60 shadow-none ring-0 transition-all hover:text-black active:translate-y-px"
        >
          <ArrowLeft className="size-4" />
          All websites
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <WebsiteFavicon domain={domain} size="large" />
            <h1 className="min-w-0 text-lg font-normal text-black/55 sm:text-xl">
              <strong className="font-semibold text-black">{domain}</strong> got{" "}
              <strong className="font-semibold text-black">{formatNumber(visitors)} visitors</strong>{" "}
              and{" "}
              <strong className="font-semibold text-black">{formatRevenue(revenueCents)} revenue</strong>{" "}
              {PERIOD_SUMMARY_LABELS[period]}.
            </h1>
          </div>
          <AnalyticsPeriodSelect period={period} site={site} />
        </div>
      </div>
      {analytics ? (
        <AppSprintFunnelPanel
          analytics={analytics}
          experimentAnalytics={experimentAnalytics ?? analytics}
          showHeroExperiment={false}
          showPricingExperiment={site === "appsprint" || site === "community"}
          showTrialExperiment={site === "postback"}
          showOnboardingExperiment={site === "postback"}
        />
      ) : (
        <div className={`px-6 py-16 text-center ${DASHBOARD_SURFACE_CLASS}`}>
          <p className="font-medium">{domain} analytics could not be loaded.</p>
          <p className="mt-1 text-sm text-black/50">
            Check the analytics endpoint and shared-secret configuration.
          </p>
        </div>
      )}
    </div>
  );
}

function getWebsiteAnalytics(site: WebsiteSite, period: Period) {
  return site === "appsprint"
    ? getAppSprintFunnelAnalytics(period)
    : site === "postback"
      ? getPostbackFunnelAnalytics(period)
      : site === "grewit"
        ? getGrewItFunnelAnalytics(period)
        : getCommunityFunnelAnalytics(period);
}

function AppSprintOperations() {
  return (
    <main className="min-h-screen bg-[#2a2725] px-4 py-6 text-[#f1ebe2] sm:px-8 sm:py-8">
      <div className="mx-auto w-full min-w-0 max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Link
            href="/analytics"
            className="inline-flex h-7 items-center gap-1 rounded-full bg-white/10 px-2.5 text-xs font-medium text-[#f1ebe2]/70 transition-colors hover:bg-white/15 hover:text-[#f1ebe2]"
          >
            <ArrowLeft className="size-3" />
            Analytics
          </Link>
          <LicensesModal />
        </div>

        <h1 className="mb-8 text-2xl font-bold tracking-tight">AppSprint ASO operations</h1>

        <h2 className="mb-4 text-lg font-bold">Live proxy health</h2>
        <div className="mb-10"><ProxyHealthPanel /></div>

        <h2 className="mb-4 text-lg font-bold">Proxy analytics</h2>
        <div className="mb-10"><ProxyAnalyticsPanel /></div>

        <h2 className="mb-4 text-lg font-bold">License usage</h2>
        <div className="mb-10"><LicenseUsagePanel /></div>

        <h2 className="mb-4 text-lg font-bold">Trial abuse</h2>
        <div className="mb-10"><TrialAbusePanel /></div>

        <h2 className="mb-4 text-lg font-bold">Feedback</h2>
        <div className="mb-10"><FeedbackPanel /></div>
      </div>
    </main>
  );
}

function buildAnalyticsUrl({
  period,
  site,
  app,
}: {
  period: Period;
  site?: WebsiteSite;
  app?: AppId;
}) {
  const params = new URLSearchParams();
  if (period !== "week") params.set("period", period);
  if (site) params.set("site", site);
  if (app) params.set("app", app);
  const query = params.toString();
  return `/analytics${query ? `?${query}` : ""}`;
}

async function AppDetail({
  period,
  appId,
}: {
  period: Period;
  appId: AppId;
}) {
  const productPromise = appId === "glow"
    ? getGlowProductReport(period)
    : appId === "versy"
      ? getVersyProductReport(period)
      : null;
  let app: MobileAppAnalytics | null = null;
  try {
    // A/B tests stay on the 30-day window and load after this render, so they
    // don't compete with the selected period for Superwall query slots.
    app = await getMobileAppById(period, appId, { sessions: period === "month" });
  } catch (error) {
    const log = process.env.NODE_ENV === "development" ? console.warn : console.error;
    log("tap_and_swipe.mobile_app_detail_failed", {
      appId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (!app) {
    return (
      <div className="space-y-5">
        <Link
          href={buildAnalyticsUrl({ period })}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-medium text-black/60 shadow-none ring-0 transition-all hover:text-black active:translate-y-px"
        >
          <ArrowLeft className="size-4" />
          All apps
        </Link>
        <p className="text-lg text-black/55">App analytics could not be loaded.</p>
      </div>
    );
  }

  const proceeds = app.revenueCents / 100;
  const windowLabel = APP_PERIOD_LABELS[period];
  const dailyConversions = new Map<string, { installs: number; conversions: number }>();
  for (const point of app.trend) {
    const day = appDayKey(point.bucket);
    const totals = dailyConversions.get(day) ?? { installs: 0, conversions: 0 };
    totals.installs += point.downloads;
    totals.conversions += app.id === "glow" ? point.trials : point.paid;
    dailyConversions.set(day, totals);
  }
  const trend = app.trend.map((point) => ({
    date: point.bucket.toISOString(),
    visits: point.downloads,
    revenue: point.revenue,
    trialStarts: point.trials,
    rate: app.cohortDataAvailable && point.downloads > 0
      ? (app.id === "glow" ? point.trials : point.paid) / point.downloads
      : undefined,
    averageRate: app.cohortDataAvailable ? dailyRate(dailyConversions.get(appDayKey(point.bucket))) : undefined,
  }));

  return (
    <div className="w-full min-w-0 space-y-10">
      <div className="w-full min-w-0 space-y-5">
        <Link
          href={buildAnalyticsUrl({ period })}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-sm font-medium text-black/60 shadow-none ring-0 transition-all hover:text-black active:translate-y-px"
        >
          <ArrowLeft className="size-4" />
          All apps
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={app.iconUrl}
              alt=""
              width={40}
              height={40}
              className="size-10 shrink-0 rounded-[10px]"
            />
            <h1 className="min-w-0 text-lg font-normal text-black/55 sm:text-xl">
              <strong className="font-semibold text-black">{app.name}</strong> got{" "}
              <strong className="font-semibold text-black">{formatNumber(app.downloads)} installs</strong>{" "}
              and{" "}
              <strong className="font-semibold text-black">{formatRevenue(app.revenueCents)} proceeds</strong>{" "}
              {PERIOD_SUMMARY_LABELS[period]}.
            </h1>
          </div>
          <AnalyticsPeriodSelect period={period} app={app.id} />
        </div>
      </div>

      <AppOverviewPanel
        appId={app.id}
        installs={app.downloads}
        proceeds={proceeds}
        windowLabel={windowLabel}
        trend={trend}
        countries={app.countries}
        dataCountries={app.dataCountries}
        cohortDataAvailable={app.cohortDataAvailable}
        experimentCountries={app.countries}
        plans={app.plans}
        retention={app.retention}
        experiments={period === "month" ? app.experiments : []}
        trialCancelTiming={app.trialCancelTiming}
        nativePaywalls={period === "month" ? app.nativePaywalls : null}
        journalPractice={period === "month" ? app.journalPractice : null}
        userJourney={app.userJourney}
        deferExperiments={period !== "month"}
        productSlot={productPromise ? (
          <Suspense fallback={<p role="status" className="px-4 py-6 text-sm text-muted-foreground">Loading {app.name} product analytics…</p>}>
            <ProductReportReady promise={productPromise} appName={app.name === "Versy" ? "Versy" : "Glow"} />
          </Suspense>
        ) : null}
      />
    </div>
  );
}

async function ProductReportReady({
  promise,
  appName,
}: {
  promise: Promise<GlowProductReport | VersyProductReport>;
  appName: "Glow" | "Versy";
}) {
  return <GlowProductPanel report={await promise} appName={appName} />;
}

function formatNumber(value: number | bigint) {
  return Number(value).toLocaleString("en-US");
}

function appDayKey(date: Date) {
  const parts = Object.fromEntries(APP_DAY_FORMATTER.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dailyRate(totals: { installs: number; conversions: number } | undefined) {
  return totals && totals.installs > 0 ? totals.conversions / totals.installs : undefined;
}



function formatRevenue(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatPreciseCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
