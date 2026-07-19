import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Globe2,
  MousePointerClick,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { countryFlag, countryLabel, referrerLabel } from "@/lib/stats-helpers";
import AnalyticsPeriodSelect from "@/components/analytics/AnalyticsPeriodSelect";
import InviteModal from "@/components/analytics/InviteModal";
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

const TAB_LABELS: Record<Tab, string> = {
  analytics: "Analytics",
  appsprint: "AppSprint",
};

const PERIOD_SUMMARY_LABELS: Record<Period, string> = {
  day: "today",
  yesterday: "yesterday",
  "3days": "in the last 3 days",
  week: "this week",
  month: "this month",
  all: "across all time",
};

const APPSPRINT_PRODUCTS = [
  "home",
  "quiz",
  "coaching",
  "community",
  "starter",
  "aso",
  "aso-solo",
  "aso-pro",
  "bundle-aso",
  "bundle-community",
] as const;

const PRODUCT_LABELS: Record<string, string> = {
  home: "Homepage",
  quiz: "Quiz",
  coaching: "Coaching",
  community: "Community",
  starter: "Community starter",
  aso: "ASO",
  "aso-solo": "ASO Solo",
  "aso-pro": "ASO Pro",
  "bundle-aso": "ASO bundle",
  "bundle-community": "Community bundle",
};

const EVENT_LABELS: Record<string, string> = {
  page_view: "Page view",
  cta_clicked: "CTA clicked",
  checkout_shown: "Checkout shown",
  stripe_shown: "Checkout shown",
  paid: "Paid",
  trial_started: "Trial started",
  quiz_start: "Quiz started",
  quiz_complete: "Quiz completed",
  quiz_booked: "Call booked",
  subscribe: "Subscribed",
};

type WebsiteMetricsRow = {
  events: number;
  page_views: number;
  visitors: number;
  conversions: number;
  revenue_cents: number;
  last_event_at: Date | null;
};

type FunnelCountsRow = {
  home_views: number;
  home_subscribes: number;
  quiz_views: number;
  quiz_starts: number;
  quiz_completes: number;
  community_views: number;
  community_cta: number;
  community_checkout: number;
  community_paid: number;
  aso_views: number;
  aso_cta: number;
  aso_checkout: number;
  aso_trials: number;
};

type CountryRow = {
  country: string | null;
  visitors: bigint;
  events: bigint;
};

type SourceRow = {
  referrer: string | null;
  visitors: bigint;
  views: bigint;
};

type WebsiteTrendPoint = {
  bucket: Date;
  visitors: number;
  conversions: number;
};

function getDateRange(period: Period) {
  const now = new Date();
  if (period === "all") {
    return { since: new Date("2000-01-01"), before: now };
  }
  if (period === "day") {
    return {
      since: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      before: now,
    };
  }
  if (period === "yesterday") {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return { since: yesterday, before: today };
  }
  if (period === "3days") {
    const since = new Date(now);
    since.setDate(since.getDate() - 3);
    return { since, before: now };
  }
  if (period === "week") {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    date.setDate(date.getDate() - date.getDay());
    return { since: date, before: now };
  }
  return {
    since: new Date(now.getFullYear(), now.getMonth(), 1),
    before: now,
  };
}

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
  searchParams: Promise<{ period?: string; tab?: string; site?: string }>;
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
  const { since, before } = getDateRange(period);
  const isAppSprintDetail = params.site === "appsprint";

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-6 text-black sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex justify-center">
          <AnalyticsTabs activeTab="analytics" />
        </div>

        {isAppSprintDetail ? (
          <AppSprintWebsiteDetail period={period} since={since} before={before} />
        ) : (
          <WebsiteDirectory period={period} since={since} before={before} />
        )}
      </div>
    </main>
  );
}

function AnalyticsTabs({
  activeTab,
  tone = "light",
}: {
  activeTab: Tab;
  tone?: "light" | "dark";
}) {
  const shellClass =
    tone === "dark"
      ? "border-white/10 bg-white/5"
      : "border-black/10 bg-white shadow-sm";

  return (
    <nav
      aria-label="Analytics sections"
      className={`flex w-fit rounded-xl border p-1 ${shellClass}`}
    >
      {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => {
        const active = activeTab === tab;
        const href = tab === "analytics" ? "/analytics" : "/analytics?tab=appsprint";
        const stateClass = active
          ? tone === "dark"
            ? "bg-white/10 text-white shadow-sm"
            : "bg-black/[0.06] text-black shadow-sm"
          : tone === "dark"
            ? "text-white/55 hover:bg-white/[0.06] hover:text-white"
            : "text-black/50 hover:bg-black/[0.04] hover:text-black";

        return (
          <Link
            key={tab}
            href={href}
            className={`inline-flex h-9 min-w-28 items-center justify-center rounded-[10px] px-4 text-sm font-medium transition-all active:translate-y-px ${stateClass}`}
          >
            {TAB_LABELS[tab]}
          </Link>
        );
      })}
    </nav>
  );
}

async function WebsiteDirectory({
  period,
  since,
  before,
}: {
  period: Period;
  since: Date;
  before: Date;
}) {
  const [metrics, trend] = await Promise.all([
    fetchWebsiteMetrics(since, before),
    fetchWebsiteTrend(period, since, before),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 text-lg text-black/55 sm:text-xl">
          Hey Arthur, you got{" "}
          <strong className="font-semibold text-black">{formatNumber(metrics.visitors)} visitors</strong>{" "}
          and made{" "}
          <strong className="font-semibold text-black">{formatRevenue(metrics.revenue_cents)}</strong>{" "}
          {PERIOD_SUMMARY_LABELS[period]}.
        </p>
        <AnalyticsPeriodSelect period={period} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <WebsiteCard period={period} metrics={metrics} trend={trend} />
      </div>
    </div>
  );
}

function WebsiteCard({
  period,
  metrics,
  trend,
}: {
  period: Period;
  metrics: WebsiteMetricsRow;
  trend: WebsiteTrendPoint[];
}) {
  const href = buildAnalyticsUrl({ period, site: "appsprint" });

  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-[24px] border border-black/[0.07] bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-black/15 hover:shadow-md active:translate-y-px"
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://www.google.com/s2/favicons?domain=appsprint.app&sz=64"
          alt=""
          width="24"
          height="24"
          className="size-6 shrink-0 rounded-md"
        />
        <h2 className="truncate text-xl font-semibold tracking-tight">appsprint.app</h2>
      </div>

      <WebsiteMiniChart points={trend} />

      <p className="text-base text-black/55">
        <strong className="font-bold text-black">{formatCompactNumber(metrics.visitors)}</strong>{" "}
        visitors
        <span className="mx-2 text-black/35">•</span>
        <strong className="font-bold text-black">{formatCompactRevenue(metrics.revenue_cents)}</strong>{" "}
        revenue
      </p>
    </Link>
  );
}

const VISITOR_CHART_COLOR = "oklch(0.62 0.14 250)";
const CONVERSION_CHART_COLOR = "oklch(0.681 0.162 75.834)";

function WebsiteMiniChart({ points }: { points: WebsiteTrendPoint[] }) {
  const width = 520;
  const height = 150;
  const left = 8;
  const right = width - 8;
  const top = 14;
  const bottom = height - 10;
  const chartHeight = bottom - top;
  const values = points.length > 0 ? points : [{ bucket: new Date(0), visitors: 0, conversions: 0 }];
  const maxVisitors = Math.max(...values.map((point) => point.visitors));
  const minVisitors = Math.min(...values.map((point) => point.visitors));
  const maxConversions = Math.max(...values.map((point) => point.conversions), 1);
  const spacing = values.length > 1 ? (right - left) / (values.length - 1) : right - left;
  const coordinates = values.map((point, index) => ({
    x: values.length > 1 ? left + index * spacing : width / 2,
    y:
      maxVisitors === minVisitors
        ? top + chartHeight * 0.42
        : top + ((maxVisitors - point.visitors) / (maxVisitors - minVisitors)) * chartHeight * 0.72,
  }));
  const linePath = buildSmoothLinePath(coordinates, left, right);
  const barWidth = Math.min(18, Math.max(6, spacing * 0.34));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="my-3 h-32 w-full overflow-visible"
      role="img"
      aria-label="Visitor trend line and conversion bars"
    >
      {values.map((point, index) => {
        if (point.conversions <= 0) return null;
        const barHeight = Math.max(7, (point.conversions / maxConversions) * chartHeight * 0.62);
        const x = values.length > 1 ? left + index * spacing : width / 2;
        return (
          <rect
            key={`${point.bucket.toISOString()}-conversion`}
            x={x - barWidth / 2}
            y={bottom - barHeight}
            width={barWidth}
            height={barHeight}
            rx="4"
            fill={CONVERSION_CHART_COLOR}
            fillOpacity="0.82"
          />
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

function AppSprintMark() {
  return (
    <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-black text-xs font-bold tracking-tight text-white shadow-sm">
      AS
    </div>
  );
}

async function AppSprintWebsiteDetail({
  period,
  since,
  before,
}: {
  period: Period;
  since: Date;
  before: Date;
}) {
  const [metrics, funnelCounts, countries, sources, recentEvents, inviteLinks] =
    await Promise.all([
      fetchWebsiteMetrics(since, before),
      fetchFunnelCounts(since, before),
      fetchCountries(since, before),
      fetchSources(since, before),
      prisma.pageEvent.findMany({
        where: {
          product: { in: [...APPSPRINT_PRODUCTS] },
          createdAt: { gte: since, lt: before },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.inviteLink.findMany({ orderBy: { createdAt: "desc" } }),
    ]);

  const serializedInvites = inviteLinks.map((invite) => ({
    id: invite.id,
    token: invite.token,
    tier: invite.tier,
    url: `https://tap-and-swipe.com/invite/${invite.token}`,
    used: Boolean(invite.usedAt),
    usedAt: invite.usedAt?.toISOString() ?? null,
    discordId: invite.discordId,
    createdAt: invite.createdAt.toISOString(),
  }));

  const funnels = buildFunnels(funnelCounts);

  return (
    <div className="space-y-10">
      <div className="space-y-5">
        <Link
          href={buildAnalyticsUrl({ period })}
          className="inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-black/10 bg-white px-2.5 text-sm font-medium text-black/60 shadow-sm transition-all hover:bg-black/[0.04] hover:text-black active:translate-y-px"
        >
          <ArrowLeft className="size-4" />
          All websites
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <AppSprintMark />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight">AppSprint</h1>
              <p className="truncate text-sm text-black/45">appsprint.app</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AnalyticsPeriodSelect period={period} site="appsprint" />
            <InviteModal initialInvites={serializedInvites} />
          </div>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<Globe2 className="size-4" />}
          label="Unique visitors"
          value={formatNumber(metrics.visitors)}
          detail={`${formatNumber(metrics.page_views)} page views`}
        />
        <MetricCard
          icon={<MousePointerClick className="size-4" />}
          label="Conversions"
          value={formatNumber(metrics.conversions)}
          detail={`${conversionRate(metrics)}% of visitors`}
        />
        <MetricCard
          icon={<Activity className="size-4" />}
          label="Tracked events"
          value={formatNumber(metrics.events)}
          detail={`${eventsPerVisitor(metrics)} per visitor`}
        />
        <MetricCard
          icon={<span className="text-sm leading-none">↻</span>}
          label="Latest activity"
          value={formatRelativeTime(metrics.last_event_at)}
          detail={formatAbsoluteDate(metrics.last_event_at)}
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Landing-page funnels</h2>
          <p className="text-sm text-black/50">
            The existing AppSprint conversion flows, now grouped inside the website dashboard.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {funnels.map((funnel) => (
            <FunnelCard key={funnel.title} {...funnel} />
          ))}
        </div>
      </section>

      <section className="grid min-w-0 gap-4 lg:grid-cols-2">
        <BreakdownCard title="Countries" description="Unique visitors by country">
          <CountriesTable rows={countries} />
        </BreakdownCard>
        <BreakdownCard title="Traffic sources" description="Unique visitors from each source">
          <SourcesTable rows={sources} />
        </BreakdownCard>
      </section>

      <section>
        <BreakdownCard title="Recent events" description="The 30 latest events in this period" flush>
          <RecentEventsTable events={recentEvents} />
        </BreakdownCard>
      </section>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-black/[0.08] px-4 py-3 text-xs font-semibold">
        <span className="text-black/45">{icon}</span>
        {label}
      </div>
      <div className="p-4">
        <p className="truncate text-2xl font-bold tabular-nums">{value}</p>
        <p className="mt-1 truncate text-xs text-black/45">{detail}</p>
      </div>
    </div>
  );
}

type Funnel = {
  title: string;
  subtitle: string;
  steps: { label: string; count: number }[];
};

function buildFunnels(row: FunnelCountsRow): Funnel[] {
  return [
    {
      title: "Homepage newsletter",
      subtitle: "/",
      steps: [
        { label: "Views", count: Number(row.home_views) },
        { label: "Subscribers", count: Number(row.home_subscribes) },
      ],
    },
    {
      title: "AppSprint quiz",
      subtitle: "/join",
      steps: [
        { label: "Views", count: Number(row.quiz_views) },
        { label: "Started", count: Number(row.quiz_starts) },
        { label: "Completed", count: Number(row.quiz_completes) },
      ],
    },
    {
      title: "Community",
      subtitle: "/community",
      steps: [
        { label: "Views", count: Number(row.community_views) },
        { label: "CTA", count: Number(row.community_cta) },
        { label: "Checkout", count: Number(row.community_checkout) },
        { label: "Paid", count: Number(row.community_paid) },
      ],
    },
    {
      title: "AppSprint ASO",
      subtitle: "/aso",
      steps: [
        { label: "Views", count: Number(row.aso_views) },
        { label: "CTA", count: Number(row.aso_cta) },
        { label: "Checkout", count: Number(row.aso_checkout) },
        { label: "Trial", count: Number(row.aso_trials) },
      ],
    },
  ];
}

function FunnelCard({ title, subtitle, steps }: Funnel) {
  return (
    <div className="overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-black/[0.08] px-4 py-3">
        <h3 className="text-xs font-semibold">{title}</h3>
        <span className="font-mono text-[11px] text-black/40">{subtitle}</span>
      </div>
      <div className="p-4">
        <LightFunnelChart steps={steps} />
      </div>
    </div>
  );
}

function LightFunnelChart({ steps }: { steps: { label: string; count: number }[] }) {
  const width = 720;
  const height = 220;
  const padding = { top: 36, bottom: 72, left: 42, right: 42 };
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;
  const centerY = padding.top + chartHeight / 2;
  const maxCount = Math.max(...steps.map((step) => step.count), 1);
  const xs = steps.map((_, index) =>
    padding.left + (index / Math.max(steps.length - 1, 1)) * chartWidth,
  );
  const halfHeights = steps.map((step) =>
    Math.max((step.count / maxCount) * (chartHeight / 2), 3),
  );

  let topPath = `M ${xs[0]},${centerY - halfHeights[0]}`;
  for (let index = 0; index < steps.length - 1; index += 1) {
    const controlX = (xs[index] + xs[index + 1]) / 2;
    topPath += ` C ${controlX},${centerY - halfHeights[index]} ${controlX},${centerY - halfHeights[index + 1]} ${xs[index + 1]},${centerY - halfHeights[index + 1]}`;
  }

  let bottomPath = `L ${xs[xs.length - 1]},${centerY + halfHeights[halfHeights.length - 1]}`;
  for (let index = steps.length - 1; index > 0; index -= 1) {
    const controlX = (xs[index] + xs[index - 1]) / 2;
    bottomPath += ` C ${controlX},${centerY + halfHeights[index]} ${controlX},${centerY + halfHeights[index - 1]} ${xs[index - 1]},${centerY + halfHeights[index - 1]}`;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label={`${steps.map((step) => `${step.label}: ${step.count}`).join(", ")}`}>
      <path d={`${topPath}${bottomPath} Z`} fill="rgba(0,0,0,0.065)" />
      {xs.slice(1, -1).map((x) => (
        <line
          key={x}
          x1={x}
          x2={x}
          y1={padding.top - 8}
          y2={height - padding.bottom + 8}
          stroke="rgba(0,0,0,0.08)"
          strokeDasharray="4 4"
        />
      ))}
      {steps.map((step, index) => {
        const previous = steps[index - 1]?.count ?? 0;
        const rate = index === 0 ? null : previous > 0 ? Math.round((step.count / previous) * 100) : 0;
        return (
          <g key={step.label}>
            <text x={xs[index]} y={18} textAnchor="middle" fill="rgba(0,0,0,.48)" fontSize="12" fontFamily="sans-serif">
              {step.label}
            </text>
            <text x={xs[index]} y={height - 34} textAnchor="middle" fill="black" fontSize="27" fontWeight="700" fontFamily="sans-serif">
              {index === 0 ? step.count.toLocaleString() : `${rate}%`}
            </text>
            {index > 0 ? (
              <text x={xs[index]} y={height - 12} textAnchor="middle" fill="rgba(0,0,0,.4)" fontSize="15" fontFamily="sans-serif">
                {step.count.toLocaleString()}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function BreakdownCard({
  title,
  description,
  children,
  flush = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-black/[0.08] bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.08] px-4 py-3">
        <h2 className="text-xs font-semibold">{title}</h2>
        <span className="text-xs text-black/40">{description}</span>
      </div>
      <div className={flush ? "min-w-0" : "min-w-0 p-4"}>{children}</div>
    </div>
  );
}

function CountriesTable({ rows }: { rows: CountryRow[] }) {
  if (rows.length === 0) return <EmptyState message="No country data in this period." />;
  const maxVisitors = Math.max(...rows.map((row) => Number(row.visitors)), 1);

  return (
    <div className="space-y-1">
      {rows.map((row) => {
        const code = row.country?.toUpperCase() ?? null;
        const visitors = Number(row.visitors);
        return (
          <div key={code ?? "unknown"} className="relative grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 overflow-hidden rounded-lg px-3 py-2.5 text-sm">
            <span
              className="absolute inset-y-0 left-0 rounded-lg bg-black/[0.035]"
              style={{ width: `${Math.max((visitors / maxVisitors) * 100, 2)}%` }}
            />
            <span className="relative flex min-w-0 items-center gap-2 truncate font-medium">
              <span className="w-5 text-base">{code && code.length === 2 ? countryFlag(code) : "🌐"}</span>
              <span className="truncate">{code ? countryLabel(code) : "Unknown"}</span>
            </span>
            <span className="relative text-right font-medium tabular-nums">{formatNumber(row.visitors)}</span>
            <span className="relative w-16 text-right text-xs tabular-nums text-black/40">{formatNumber(row.events)} ev.</span>
          </div>
        );
      })}
    </div>
  );
}

function SourcesTable({ rows }: { rows: SourceRow[] }) {
  if (rows.length === 0) return <EmptyState message="No traffic-source data in this period." />;
  const maxVisitors = Math.max(...rows.map((row) => Number(row.visitors)), 1);

  return (
    <div className="space-y-1">
      {rows.map((row) => {
        const visitors = Number(row.visitors);
        const source = row.referrer ? referrerLabel(row.referrer) : "Direct";
        return (
          <div key={row.referrer ?? "direct"} className="relative grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 overflow-hidden rounded-lg px-3 py-2.5 text-sm">
            <span
              className="absolute inset-y-0 left-0 rounded-lg bg-black/[0.035]"
              style={{ width: `${Math.max((visitors / maxVisitors) * 100, 2)}%` }}
            />
            <span className="relative truncate font-medium">{source}</span>
            <span className="relative text-right font-medium tabular-nums">{formatNumber(row.visitors)}</span>
            <span className="relative w-16 text-right text-xs tabular-nums text-black/40">{formatNumber(row.views)} views</span>
          </div>
        );
      })}
    </div>
  );
}

type RecentEvent = Awaited<ReturnType<typeof prisma.pageEvent.findMany>>[number];

function RecentEventsTable({ events }: { events: RecentEvent[] }) {
  if (events.length === 0) return <EmptyState message="No events in this period." padded />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-black/[0.08] text-left text-xs text-black/45">
            <th className="px-4 py-3 font-medium">Event</th>
            <th className="px-4 py-3 font-medium">Page</th>
            <th className="px-4 py-3 font-medium">Country</th>
            <th className="px-4 py-3 font-medium">Source</th>
            <th className="px-4 py-3 text-right font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => {
            const countryCode = event.country?.toUpperCase();
            return (
              <tr key={event.id} className="border-b border-black/[0.06] last:border-b-0 hover:bg-black/[0.015]">
                <td className="px-4 py-3">
                  <EventBadge type={event.type} />
                </td>
                <td className="px-4 py-3 font-medium">{PRODUCT_LABELS[event.product] ?? event.product}</td>
                <td className="px-4 py-3 text-black/60">
                  {countryCode && countryCode.length === 2 ? `${countryFlag(countryCode)} ${countryLabel(countryCode)}` : "Unknown"}
                </td>
                <td className="max-w-52 truncate px-4 py-3 text-black/60">
                  {event.ref ?? (event.referrer ? referrerLabel(event.referrer) : "Direct")}
                </td>
                <td className="px-4 py-3 text-right text-xs text-black/45">
                  <time dateTime={event.createdAt.toISOString()} title={formatAbsoluteDate(event.createdAt)}>
                    {formatRelativeTime(event.createdAt)}
                  </time>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EventBadge({ type }: { type: string }) {
  const conversion = ["paid", "trial_started", "subscribe", "quiz_complete"].includes(type);
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${conversion ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15" : "bg-black/[0.05] text-black/65 ring-1 ring-black/[0.04]"}`}>
      {EVENT_LABELS[type] ?? type.replaceAll("_", " ")}
    </span>
  );
}

function EmptyState({ message, padded = false }: { message: string; padded?: boolean }) {
  return <p className={`text-center text-sm text-black/40 ${padded ? "px-4 py-12" : "py-8"}`}>{message}</p>;
}

function AppSprintOperations() {
  return (
    <main className="min-h-screen bg-[#2a2725] px-4 py-6 text-[#f1ebe2] sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <span />
          <AnalyticsTabs activeTab="appsprint" tone="dark" />
          <div className="justify-self-end">
            <LicensesModal />
          </div>
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

async function fetchWebsiteMetrics(since: Date, before: Date) {
  const [row] = await prisma.$queryRaw<[WebsiteMetricsRow]>`
    SELECT
      COUNT(*)::int AS events,
      COUNT(*) FILTER (WHERE type = 'page_view')::int AS page_views,
      COUNT(DISTINCT "visitorId") FILTER (WHERE type = 'page_view')::int AS visitors,
      COUNT(*) FILTER (WHERE type IN ('subscribe', 'paid', 'trial_started', 'quiz_complete'))::int AS conversions,
      COALESCE(SUM(revenue), 0)::int AS revenue_cents,
      MAX("createdAt") AS last_event_at
    FROM "PageEvent"
    WHERE product IN ('home', 'quiz', 'coaching', 'community', 'starter', 'aso', 'aso-solo', 'aso-pro', 'bundle-aso', 'bundle-community')
      AND "createdAt" >= ${since}
      AND "createdAt" < ${before}
  `;

  return row ?? {
    events: 0,
    page_views: 0,
    visitors: 0,
    conversions: 0,
    revenue_cents: 0,
    last_event_at: null,
  };
}

async function fetchWebsiteTrend(period: Period, since: Date, before: Date) {
  const bucket = period === "day" || period === "yesterday" ? "hour" : period === "all" ? "month" : "day";

  return prisma.$queryRaw<WebsiteTrendPoint[]>`
    SELECT
      date_trunc(${bucket}, "createdAt") AS bucket,
      COUNT(DISTINCT "visitorId") FILTER (WHERE type = 'page_view')::int AS visitors,
      COUNT(*) FILTER (WHERE type IN ('subscribe', 'paid', 'trial_started', 'quiz_complete'))::int AS conversions
    FROM "PageEvent"
    WHERE product IN ('home', 'quiz', 'coaching', 'community', 'starter', 'aso', 'aso-solo', 'aso-pro', 'bundle-aso', 'bundle-community')
      AND "createdAt" >= ${since}
      AND "createdAt" < ${before}
    GROUP BY bucket
    ORDER BY bucket
  `;
}

async function fetchFunnelCounts(since: Date, before: Date) {
  const [row] = await prisma.$queryRaw<[FunnelCountsRow]>`
    SELECT
      COUNT(*) FILTER (WHERE product = 'home' AND type = 'page_view')::int AS home_views,
      COUNT(*) FILTER (WHERE product = 'home' AND type = 'subscribe')::int AS home_subscribes,
      COUNT(*) FILTER (WHERE product = 'quiz' AND type = 'page_view')::int AS quiz_views,
      COUNT(*) FILTER (WHERE product = 'quiz' AND type = 'quiz_start')::int AS quiz_starts,
      COUNT(*) FILTER (WHERE product = 'quiz' AND type = 'quiz_complete')::int AS quiz_completes,
      COUNT(*) FILTER (WHERE product IN ('community', 'starter', 'bundle-community') AND type = 'page_view')::int AS community_views,
      COUNT(*) FILTER (WHERE product IN ('community', 'starter', 'bundle-community') AND type = 'cta_clicked')::int AS community_cta,
      COUNT(*) FILTER (WHERE product IN ('community', 'starter', 'bundle-community') AND type IN ('stripe_shown', 'checkout_shown'))::int AS community_checkout,
      COUNT(*) FILTER (WHERE product IN ('community', 'starter', 'bundle-community') AND type = 'paid')::int AS community_paid,
      COUNT(*) FILTER (WHERE product IN ('aso', 'aso-solo', 'aso-pro', 'bundle-aso') AND type = 'page_view')::int AS aso_views,
      COUNT(*) FILTER (WHERE product IN ('aso', 'aso-solo', 'aso-pro', 'bundle-aso') AND type = 'cta_clicked')::int AS aso_cta,
      COUNT(*) FILTER (WHERE product IN ('aso', 'aso-solo', 'aso-pro', 'bundle-aso') AND type IN ('stripe_shown', 'checkout_shown'))::int AS aso_checkout,
      COUNT(*) FILTER (WHERE product IN ('aso', 'aso-solo', 'aso-pro', 'bundle-aso') AND type = 'trial_started')::int AS aso_trials
    FROM "PageEvent"
    WHERE "createdAt" >= ${since}
      AND "createdAt" < ${before}
  `;

  return row ?? {
    home_views: 0,
    home_subscribes: 0,
    quiz_views: 0,
    quiz_starts: 0,
    quiz_completes: 0,
    community_views: 0,
    community_cta: 0,
    community_checkout: 0,
    community_paid: 0,
    aso_views: 0,
    aso_cta: 0,
    aso_checkout: 0,
    aso_trials: 0,
  };
}

async function fetchCountries(since: Date, before: Date) {
  return prisma.$queryRaw<CountryRow[]>`
    SELECT
      country,
      COUNT(DISTINCT "visitorId") FILTER (WHERE type = 'page_view')::bigint AS visitors,
      COUNT(*)::bigint AS events
    FROM "PageEvent"
    WHERE product IN ('home', 'quiz', 'coaching', 'community', 'starter', 'aso', 'aso-solo', 'aso-pro', 'bundle-aso', 'bundle-community')
      AND "createdAt" >= ${since}
      AND "createdAt" < ${before}
    GROUP BY country
    ORDER BY visitors DESC, events DESC
    LIMIT 12
  `;
}

async function fetchSources(since: Date, before: Date) {
  return prisma.$queryRaw<SourceRow[]>`
    SELECT
      referrer,
      COUNT(DISTINCT "visitorId")::bigint AS visitors,
      COUNT(*)::bigint AS views
    FROM "PageEvent"
    WHERE product IN ('home', 'quiz', 'coaching', 'community', 'starter', 'aso', 'aso-solo', 'aso-pro', 'bundle-aso', 'bundle-community')
      AND type = 'page_view'
      AND "createdAt" >= ${since}
      AND "createdAt" < ${before}
    GROUP BY referrer
    ORDER BY visitors DESC, views DESC
    LIMIT 12
  `;
}

function buildAnalyticsUrl({
  period,
  site,
}: {
  period: Period;
  site?: "appsprint";
}) {
  const params = new URLSearchParams();
  if (period !== "week") params.set("period", period);
  if (site) params.set("site", site);
  const query = params.toString();
  return `/analytics${query ? `?${query}` : ""}`;
}

function formatNumber(value: number | bigint) {
  return Number(value).toLocaleString("en-US");
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

function conversionRate(metrics: WebsiteMetricsRow) {
  const visitors = Number(metrics.visitors);
  return visitors > 0 ? ((Number(metrics.conversions) / visitors) * 100).toFixed(1) : "0.0";
}

function eventsPerVisitor(metrics: WebsiteMetricsRow) {
  const visitors = Number(metrics.visitors);
  return visitors > 0 ? (Number(metrics.events) / visitors).toFixed(1) : "0.0";
}

function formatRelativeTime(value: Date | null) {
  if (!value) return "No activity";
  const seconds = Math.max(0, Math.floor((Date.now() - value.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return value.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatAbsoluteDate(value: Date | null) {
  if (!value) return "No events in this period";
  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
