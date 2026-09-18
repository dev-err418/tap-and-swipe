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
  getMobileAppAnalytics,
  getMobileAppById,
  type MobileAppAnalytics,
} from "@/lib/mobile-app-analytics";
import AppOverviewPanel from "@/components/analytics/AppOverviewPanel";
import AnalyticsPeriodSelect from "@/components/analytics/AnalyticsPeriodSelect";
import DeadProjectsDisclosure from "@/components/analytics/DeadProjectsDisclosure";
import { DASHBOARD_SURFACE_CLASS } from "@/components/analytics/dashboard-surface";
import AppSprintFunnelPanel from "@/components/analytics/AppSprintFunnelPanel";
import LicensesModal from "@/components/aso-debug/LicensesModal";
import ProxyAnalyticsPanel from "@/components/aso-debug/ProxyAnalyticsPanel";
import ProxyHealthPanel from "@/components/aso-debug/ProxyHealthPanel";
import LicenseUsagePanel from "@/components/aso-debug/LicenseUsagePanel";
import FeedbackPanel from "@/components/aso-debug/FeedbackPanel";
import TrialAbusePanel from "@/components/aso-debug/TrialAbusePanel";

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

type WebsiteMetricsRow = {
  visitors: number;
  revenue_cents: number;
};

type WebsiteTrendPoint = {
  bucket: Date;
  visitors: number;
  revenue: number;
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

  return (
    <main className="min-h-screen px-4 py-6 text-black sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl">
        {detailApp ? (
          <AppDetail period={period} appId={detailApp} />
        ) : detailSite ? (
          <WebsiteDetail period={period} site={detailSite} />
        ) : (
          <WebsiteDirectory period={period} />
        )}
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

async function WebsiteDirectory({
  period,
}: {
  period: Period;
}) {
  const [appSprintAnalytics, postbackAnalytics, grewItAnalytics, communityAnalytics, mobileApps] = await Promise.all([
    getAppSprintFunnelAnalytics(period),
    getPostbackFunnelAnalytics(period),
    getGrewItFunnelAnalytics(period),
    getCommunityFunnelAnalytics(period),
    getMobileAppAnalytics(period),
  ]);
  const liveApps = mobileApps.filter((app) => app.id !== "versy");
  const deadApps = mobileApps.filter((app) => app.id === "versy");
  const liveWebsites = [
    appSprintAnalytics
      ? websiteData("appsprint", "appsprint.app", appSprintAnalytics)
      : null,
    websiteData("community", "community", communityAnalytics),
  ].filter((website) => website !== null);
  const deadWebsites = [
    postbackAnalytics
      ? websiteData("postback", "postback.sh", postbackAnalytics)
      : null,
    grewItAnalytics
      ? websiteData("grewit", "grewit.app", grewItAnalytics)
      : null,
  ].filter((website) => website !== null);

  const appDownloads = liveApps.reduce((sum, app) => sum + app.downloads, 0);
  const appRevenueCents = liveApps.reduce((sum, app) => sum + app.revenueCents, 0);
  const websiteVisitors = liveWebsites.reduce((sum, website) => sum + website.metrics.visitors, 0);
  const websiteRevenueCents = liveWebsites.reduce((sum, website) => sum + website.metrics.revenue_cents, 0);
  const periodLabel = PERIOD_SUMMARY_LABELS[period];

  return (
    <div className="space-y-12">
      {liveApps.length > 0 ? (
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <p className="min-w-0 text-lg text-black/55 sm:text-xl">
              Hey Arthur, you got{" "}
              <strong className="font-semibold text-black">{formatNumber(appDownloads)} downloads</strong>
              {" "}and{" "}
              <strong className="font-semibold text-black">{formatRevenue(appRevenueCents)}</strong>
              {" "}proceeds {periodLabel}.
            </p>
            <AnalyticsPeriodSelect period={period} />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {liveApps.map((app) => (
              <MobileAppCard key={app.id} app={app} period={period} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          {liveWebsites.length > 0 ? (
            <p className="min-w-0 text-lg text-black/55 sm:text-xl">
              Hey Arthur, you got{" "}
              <strong className="font-semibold text-black">{formatNumber(websiteVisitors)} visitors</strong>
              {" "}and made{" "}
              <strong className="font-semibold text-black">{formatRevenue(websiteRevenueCents)}</strong>{" "}
              {periodLabel}.
            </p>
          ) : (
            <p className="text-lg text-black/55 sm:text-xl">Website analytics could not be loaded.</p>
          )}
          {liveApps.length === 0 ? <AnalyticsPeriodSelect period={period} /> : null}
        </div>
        {liveWebsites.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {liveWebsites.map((website) => (
              <WebsiteCard key={website.site} period={period} {...website} />
            ))}
          </div>
        ) : (
          <div className={`px-6 py-14 text-center text-sm text-black/45 ${DASHBOARD_SURFACE_CLASS}`}>
            Check the AppSprint, Postback, and Grew It analytics endpoints and database configuration.
          </div>
        )}
        {deadApps.length > 0 || deadWebsites.length > 0 ? (
          <DeadProjectsDisclosure>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {deadApps.map((app) => (
                <MobileAppCard key={app.id} app={app} period={period} />
              ))}
              {deadWebsites.map((website) => (
                <WebsiteCard key={website.site} period={period} {...website} />
              ))}
            </div>
          </DeadProjectsDisclosure>
        ) : null}
      </section>
    </div>
  );
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
  return { site, domain, metrics, trend };
}

function WebsiteCard({
  period,
  site,
  domain,
  metrics,
  trend,
}: {
  period: Period;
  site: WebsiteSite;
  domain: string;
  metrics: WebsiteMetricsRow;
  trend: WebsiteTrendPoint[];
}) {
  const href = buildAnalyticsUrl({ period, site });

  return (
    <Link
      href={href}
      className={`block cursor-pointer overflow-hidden p-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black/40 ${DASHBOARD_SURFACE_CLASS}`}
    >
      <div className="pointer-events-none select-none">
        <div className="flex items-center gap-3">
          <WebsiteFavicon domain={domain} size="small" />
          <h2 className="truncate text-xl font-semibold tracking-tight">{domain}</h2>
        </div>

        <WebsiteMiniChart points={trend} />

        <p className="text-base text-black/55">
          <strong className="font-bold text-black">{formatCompactNumber(metrics.visitors)}</strong>{" "}
          visitors
          <span className="mx-2 text-black/35">•</span>
          <strong className="font-bold text-black">{formatCompactRevenue(metrics.revenue_cents)}</strong>{" "}
          revenue
        </p>
      </div>
    </Link>
  );
}

function MobileAppCard({ app, period }: { app: MobileAppAnalytics; period: Period }) {
  const points: WebsiteTrendPoint[] = app.trend.map((point) => ({
    bucket: point.bucket,
    visitors: point.downloads,
    revenue: point.revenue,
  }));

  return (
    <Link
      href={buildAnalyticsUrl({ period, app: app.id })}
      className={`block cursor-pointer overflow-hidden p-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black/40 ${DASHBOARD_SURFACE_CLASS}`}
    >
      <div className="pointer-events-none select-none">
        <div className="flex items-center gap-3">
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
          <strong className="font-bold text-black">{formatAppu(app.revenueCents, app.downloads)}</strong>{" "}
          APPU
        </p>
      </div>
    </Link>
  );
}

const VISITOR_CHART_COLOR = "#1d4ed8";
const POSTBACK_ORANGE = "#f97316";

function WebsiteMiniChart({
  points,
  ariaLabel = "Visitor trend line and revenue bars",
}: {
  points: WebsiteTrendPoint[];
  ariaLabel?: string;
}) {
  const width = 520;
  const height = 150;
  const left = 8;
  const right = width - 8;
  const top = 14;
  const bottom = height - 10;
  const chartHeight = bottom - top;
  const values = points.length > 0 ? points : [{ bucket: new Date(0), visitors: 0, revenue: 0 }];
  const maxVisitors = Math.max(...values.map((point) => point.visitors));
  const minVisitors = Math.min(...values.map((point) => point.visitors));
  const maxRevenue = Math.max(...values.map((point) => point.revenue), 1);
  const spacing = values.length > 1 ? (right - left) / (values.length - 1) : right - left;
  const coordinates = values.map((point, index) => ({
    x: values.length > 1 ? left + index * spacing : width / 2,
    y:
      maxVisitors === minVisitors
        ? top + chartHeight * 0.42
        : top + ((maxVisitors - point.visitors) / (maxVisitors - minVisitors)) * chartHeight * 0.72,
  }));
  const linePath = buildSmoothLinePath(coordinates, left, right);
  const barWidth = Math.min(22, Math.max(6, spacing * 0.78));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="pointer-events-none my-3 h-32 w-full overflow-visible"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id="postback-orange-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={`color-mix(in oklch, ${POSTBACK_ORANGE}, white 15%)`} />
          <stop offset="1" stopColor={POSTBACK_ORANGE} />
        </linearGradient>
        <filter id="postback-orange-shadow" x="-30%" y="-15%" width="160%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.08" />
        </filter>
      </defs>
      {values.map((point, index) => {
        if (point.revenue <= 0) return null;
        const barHeight = Math.max(7, (point.revenue / maxRevenue) * chartHeight * 0.62);
        const x = values.length > 1 ? left + index * spacing : width / 2;
        return (
          <g key={`${point.bucket.toISOString()}-conversion`} filter="url(#postback-orange-shadow)">
            <rect
              x={x - barWidth / 2}
              y={bottom - barHeight}
              width={barWidth}
              height={barHeight}
              rx="4"
              fill="url(#postback-orange-glass)"
              stroke={`color-mix(in oklch, ${POSTBACK_ORANGE}, black 10%)`}
              strokeWidth="1"
            />
            <path
              d={`M ${x - barWidth / 2 + 4} ${bottom - barHeight + 1.5} H ${x + barWidth / 2 - 4}`}
              fill="none"
              stroke={`color-mix(in oklch, ${POSTBACK_ORANGE}, white 30%)`}
              strokeWidth="1"
              strokeLinecap="round"
            />
          </g>
        );
      })}
      <path
        d={linePath}
        fill="none"
        stroke={VISITOR_CHART_COLOR}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function buildSmoothLinePath(
  points: { x: number; y: number }[],
  left: number,
  right: number,
) {
  if (points.length === 1) return `M ${left},${points[0].y} L ${right},${points[0].y}`;

  let path = `M ${points[0].x},${points[0].y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    const controlX = (current.x + next.x) / 2;
    path += ` C ${controlX},${current.y} ${controlX},${next.y} ${next.x},${next.y}`;
  }
  return path;
}

async function WebsiteDetail({
  period,
  site,
}: {
  period: Period;
  site: WebsiteSite;
}) {
  const analytics = site === "appsprint"
    ? await getAppSprintFunnelAnalytics(period)
    : site === "postback"
      ? await getPostbackFunnelAnalytics(period)
      : site === "grewit"
        ? await getGrewItFunnelAnalytics(period)
        : await getCommunityFunnelAnalytics(period);
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
          showHeroExperiment={false}
          showPricingExperiment={site === "appsprint"}
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

function AppSprintOperations() {
  return (
    <main className="min-h-screen bg-[#2a2725] px-4 py-6 text-[#f1ebe2] sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
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
  let app: MobileAppAnalytics | null = null;
  try {
    app = await getMobileAppById(period, appId);
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
  const trend = app.trend.map((point) => ({
    date: point.bucket.toISOString(),
    visits: point.downloads,
    revenue: point.revenue,
    trialStarts: 0,
  }));

  return (
    <div className="space-y-10">
      <div className="space-y-5">
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
        installs={app.downloads}
        proceeds={proceeds}
        paid={app.paid}
        windowLabel={windowLabel}
        trend={trend}
        countries={app.countries}
        plans={app.plans}
        retention={app.retention}
        experiments={app.experiments}
        trialCancelTiming={app.trialCancelTiming}
      />
    </div>
  );
}

function formatNumber(value: number | bigint) {
  return Number(value).toLocaleString("en-US");
}

function websiteFaviconUrl(domain: string) {
  if (domain === "appsprint.app") return "https://appsprint.app/app-icon.png";
  if (domain === "postback.sh") return "https://postback.sh/icon.png";
  if (domain === "grewit.app") return "/icons/grewit.png";
  return "/icon.png";
}

function WebsiteFavicon({
  domain,
  size,
}: {
  domain: string;
  size: "small" | "large";
}) {
  const isPostback = domain === "postback.sh";
  const sizeClass = size === "small" ? "size-6 rounded-md" : "size-10 rounded-[10px]";
  const imageSize = size === "small" ? 24 : 40;

  if (isPostback) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center bg-black ${sizeClass}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={websiteFaviconUrl(domain)}
          alt=""
          width={imageSize}
          height={imageSize}
          className="size-full invert"
        />
      </span>
    );
  }

  if (domain === "community") {
    return (
      <span
        className={`block shrink-0 overflow-hidden ${sizeClass}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={websiteFaviconUrl(domain)}
          alt=""
          width={imageSize}
          height={imageSize}
          className="size-full invert"
        />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={websiteFaviconUrl(domain)}
      alt=""
      width={imageSize}
      height={imageSize}
      className={`shrink-0 ${sizeClass}`}
    />
  );
}

function formatRevenue(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatCompactNumber(value: number | bigint) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  })
    .format(Number(value))
    .replace("K", "k");
}

function formatCompactRevenue(cents: number) {
  return `$${formatCompactNumber(cents / 100)}`;
}

function formatAppu(revenueCents: number, users: number) {
  if (users <= 0) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(revenueCents / 100 / users);
}
