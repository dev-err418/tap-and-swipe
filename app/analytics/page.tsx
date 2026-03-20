import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import LeadTable from "@/components/analytics/LeadTable";
import InviteModal from "@/components/analytics/InviteModal";
import ExpandableGroup from "@/components/analytics/ExpandableGroup";
import LicensesModal from "@/components/aso-debug/LicensesModal";
import ProxyAnalyticsPanel from "@/components/aso-debug/ProxyAnalyticsPanel";
import FeedbackPanel from "@/components/aso-debug/FeedbackPanel";

export const dynamic = "force-dynamic";

type Period = "day" | "week" | "month" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  day: "Today",
  week: "This week",
  month: "This month",
  all: "All time",
};

const BENCHMARKS: Record<string, number> = {
  start: 40,
  complete: 50,
  optin: 60,
  booking: 15,
};

const BENCHMARK_LABELS: Record<string, string> = {
  start: "Start rate",
  complete: "Completion rate",
  optin: "Optin rate",
  booking: "Booking rate",
};

function getDateFilter(period: Period) {
  if (period === "all") return undefined;
  const now = new Date();
  if (period === "day") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week") {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - d.getDay());
    return d;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

type Tab = "sprint" | "aso";

const TAB_LABELS: Record<Tab, string> = {
  sprint: "App Sprint",
  aso: "ASO",
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; tab?: string }>;
}) {
  const session = await getSession();
  if (session?.discordId !== process.env.ADMIN_DISCORD_ID) {
    notFound();
  }

  const params = await searchParams;
  const tab = (["sprint", "aso"].includes(params.tab ?? "") ? params.tab : "sprint") as Tab;
  const period = (["day", "week", "month", "all"].includes(params.period ?? "")
    ? params.period
    : "week") as Period;

  const gte = getDateFilter(period);
  const dateWhere = gte ? { createdAt: { gte } } : {};

  function buildUrl(overrides: { period?: Period; tab?: Tab } = {}) {
    const t = overrides.tab ?? tab;
    const p = overrides.period ?? period;
    const sp = new URLSearchParams();
    if (t !== "sprint") sp.set("tab", t);
    if (p !== "week") sp.set("period", p);
    const qs = sp.toString();
    return `/analytics${qs ? `?${qs}` : ""}`;
  }

  // ── Tab toggle (shared) ──
  const tabToggle = (
    <div className="flex gap-1 rounded-xl bg-white/5 p-1 w-fit">
      {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
        <Link
          key={t}
          href={buildUrl({ tab: t })}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === t
              ? "bg-[#f4cf8f] text-[#2a2725]"
              : "text-[#c9c4bc] hover:text-[#f1ebe2]"
          }`}
        >
          {TAB_LABELS[t]}
        </Link>
      ))}
    </div>
  );

  // ── Period selector (shared) ──
  const periodSelector = (
    <div className="flex gap-1 rounded-xl bg-white/5 p-1">
      {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
        <Link
          key={p}
          href={buildUrl({ period: p })}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            period === p
              ? "bg-[#f4cf8f] text-[#2a2725]"
              : "text-[#c9c4bc] hover:text-[#f1ebe2]"
          }`}
        >
          {PERIOD_LABELS[p]}
        </Link>
      ))}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // ASO Tab — operational tools only
  // ═══════════════════════════════════════════════════════════════════════════
  if (tab === "aso") {
    return (
      <div className="min-h-screen bg-[#2a2725] text-[#f1ebe2] p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            {tabToggle}
            <LicensesModal />
          </div>

          <h3 className="text-lg font-bold mb-4">Proxy analytics</h3>
          <div className="mb-10">
            <ProxyAnalyticsPanel />
          </div>

          <h3 className="text-lg font-bold mb-4">Feedback</h3>
          <div className="mb-10">
            <FeedbackPanel />
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // App Sprint Tab — 3-column layout: 1:1, Community, ASO web funnels
  // ═══════════════════════════════════════════════════════════════════════════

  const since = gte ?? new Date("2000-01-01");

  const [countsArr, sourcesRaw, leads, inviteLinks] = await Promise.all([
    // All counts + revenue in a single query
    prisma.$queryRaw<[{
      q_views: number; q_starts: number; q_completes: number; q_bookings: number; q_leads: number;
      c_views: number; c_cta: number; c_stripe: number; c_paid: number; c_revenue: number;
      a_views: number; a_cta: number; a_stripe: number; a_trials: number; a_revenue: number;
    }]>`
      SELECT
        (SELECT COUNT(*)::int FROM "QuizEvent" WHERE type='page_view' AND "createdAt">=${since}) as q_views,
        (SELECT COUNT(*)::int FROM "QuizEvent" WHERE type='quiz_start' AND "createdAt">=${since}) as q_starts,
        (SELECT COUNT(*)::int FROM "QuizEvent" WHERE type='quiz_complete' AND "createdAt">=${since}) as q_completes,
        (SELECT COUNT(*)::int FROM "QuizEvent" WHERE type='booking_click' AND "createdAt">=${since}) as q_bookings,
        (SELECT COUNT(*)::int FROM "QuizLead" WHERE "createdAt">=${since}) as q_leads,
        (SELECT COUNT(*)::int FROM "PageEvent" WHERE product='community' AND type='page_view' AND "createdAt">=${since}) as c_views,
        (SELECT COUNT(*)::int FROM "PageEvent" WHERE product='community' AND type='cta_clicked' AND "createdAt">=${since}) as c_cta,
        (SELECT COUNT(*)::int FROM "PageEvent" WHERE product='community' AND type='stripe_shown' AND "createdAt">=${since}) as c_stripe,
        (SELECT COUNT(*)::int FROM "PageEvent" WHERE product='community' AND type='paid' AND "createdAt">=${since}) as c_paid,
        COALESCE((SELECT SUM(revenue)::int FROM "PageEvent" WHERE product='community' AND type='paid' AND "createdAt">=${since}), 0) as c_revenue,
        (SELECT COUNT(*)::int FROM "PageEvent" WHERE product='aso' AND type='page_view' AND "createdAt">=${since}) as a_views,
        (SELECT COUNT(*)::int FROM "PageEvent" WHERE product='aso' AND type='cta_clicked' AND "createdAt">=${since}) as a_cta,
        (SELECT COUNT(*)::int FROM "PageEvent" WHERE product='aso' AND type='stripe_shown' AND "createdAt">=${since}) as a_stripe,
        (SELECT COUNT(*)::int FROM "PageEvent" WHERE product='aso' AND type='trial_started' AND "createdAt">=${since}) as a_trials,
        COALESCE((SELECT SUM(revenue)::int FROM "PageEvent" WHERE product='aso' AND type='trial_started' AND "createdAt">=${since}), 0) as a_revenue
    `,
    // All source groupBys in a single query
    prisma.$queryRaw<{ kind: string; ref: string | null; count: bigint }[]>`
      SELECT 'q_traffic' as kind, source as ref, COUNT(*)::bigint as count
      FROM "QuizEvent" WHERE type='page_view' AND "createdAt">=${since}
      GROUP BY source
      UNION ALL
      SELECT 'q_leads' as kind, source as ref, COUNT(*)::bigint as count
      FROM "QuizLead" WHERE "createdAt">=${since}
      GROUP BY source
      UNION ALL
      SELECT 'c_traffic' as kind, referrer as ref, COUNT(*)::bigint as count
      FROM "PageEvent" WHERE product='community' AND type='page_view' AND "createdAt">=${since}
      GROUP BY referrer
      UNION ALL
      SELECT 'a_traffic' as kind, referrer as ref, COUNT(*)::bigint as count
      FROM "PageEvent" WHERE product='aso' AND type='page_view' AND "createdAt">=${since}
      GROUP BY referrer
      UNION ALL
      SELECT 'c_payment' as kind, pv.referrer as ref, COUNT(DISTINCT pv."visitorId")::bigint as count
      FROM "PageEvent" pv
      INNER JOIN "PageEvent" conv ON conv."visitorId"=pv."visitorId"
        AND conv.product='community' AND conv.type='paid' AND conv."createdAt">=${since}
      WHERE pv.product='community' AND pv.type='page_view'
      GROUP BY pv.referrer
      UNION ALL
      SELECT 'a_payment' as kind, pv.referrer as ref, COUNT(DISTINCT pv."visitorId")::bigint as count
      FROM "PageEvent" pv
      INNER JOIN "PageEvent" conv ON conv."visitorId"=pv."visitorId"
        AND conv.product='aso' AND conv.type='trial_started' AND conv."createdAt">=${since}
      WHERE pv.product='aso' AND pv.type='page_view'
      GROUP BY pv.referrer
    `,
    prisma.quizLead.findMany({
      where: gte ? { createdAt: { gte } } : {},
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.inviteLink.findMany({
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const {
    q_views: pageViews, q_starts: quizStarts, q_completes: quizCompletes,
    q_bookings: bookingClicks, q_leads: optins,
    c_views: cPageViews, c_cta: cCtaClicked, c_stripe: cStripeShown,
    c_paid: cPaid, c_revenue: cTotalRevenue,
    a_views: aPageViews, a_cta: aCtaClicked, a_stripe: aStripeShown,
    a_trials: aPaid, a_revenue: aTotalRevenue,
  } = countsArr[0];

  const sourceRows = (kind: string) =>
    sourcesRaw
      .filter((r) => r.kind === kind)
      .sort((a, b) => Number(b.count) - Number(a.count))
      .map((r) => ({ source: r.ref, count: Number(r.count) }));

  // ── 1:1 Quiz funnel ──
  const quizFunnel: FunnelStep[] = [
    { label: "Page views", shortLabel: "Views", count: pageViews, rate: null, benchmark: null },
    {
      label: "Quiz starts", shortLabel: "Starts",
      count: quizStarts,
      rate: pageViews > 0 ? Math.round((quizStarts / pageViews) * 100) : 0,
      benchmark: "start",
    },
    {
      label: "Quiz completions", shortLabel: "Completes",
      count: quizCompletes,
      rate: quizStarts > 0 ? Math.round((quizCompletes / quizStarts) * 100) : 0,
      benchmark: "complete",
    },
    {
      label: "Optins", shortLabel: "Optins",
      count: optins,
      rate: quizCompletes > 0 ? Math.round((optins / quizCompletes) * 100) : 0,
      benchmark: "optin",
    },
    {
      label: "Booking clicks", shortLabel: "Bookings",
      count: bookingClicks,
      rate: optins > 0 ? Math.round((bookingClicks / optins) * 100) : 0,
      benchmark: "booking",
    },
  ];
  const quizMaxCount = Math.max(...quizFunnel.map((f) => f.count), 1);

  // ── Community funnel ──
  const communityFunnel: FunnelStep[] = [
    { label: "Page views", shortLabel: "Views", count: cPageViews, rate: null, benchmark: null },
    {
      label: "CTA clicked", shortLabel: "CTA",
      count: cCtaClicked,
      rate: cPageViews > 0 ? Math.round((cCtaClicked / cPageViews) * 100) : 0,
      benchmark: null,
    },
    {
      label: "Stripe shown", shortLabel: "Stripe",
      count: cStripeShown,
      rate: cCtaClicked > 0 ? Math.round((cStripeShown / cCtaClicked) * 100) : 0,
      benchmark: null,
    },
    {
      label: "Paid", shortLabel: "Paid",
      count: cPaid,
      rate: cStripeShown > 0 ? Math.round((cPaid / cStripeShown) * 100) : 0,
      benchmark: null,
    },
  ];
  const cMaxCount = Math.max(...communityFunnel.map((f) => f.count), 1);

  // ── ASO web funnel ──
  const asoFunnel: FunnelStep[] = [
    { label: "Page views", shortLabel: "Views", count: aPageViews, rate: null, benchmark: null },
    {
      label: "CTA clicked", shortLabel: "CTA",
      count: aCtaClicked,
      rate: aPageViews > 0 ? Math.round((aCtaClicked / aPageViews) * 100) : 0,
      benchmark: null,
    },
    {
      label: "Stripe shown", shortLabel: "Stripe",
      count: aStripeShown,
      rate: aCtaClicked > 0 ? Math.round((aStripeShown / aCtaClicked) * 100) : 0,
      benchmark: null,
    },
    {
      label: "Trials started", shortLabel: "Trials",
      count: aPaid,
      rate: aStripeShown > 0 ? Math.round((aPaid / aStripeShown) * 100) : 0,
      benchmark: null,
    },
  ];
  const aMaxCount = Math.max(...asoFunnel.map((f) => f.count), 1);

  // Serialize data for client components
  const serializedInvites = inviteLinks.map((inv) => ({
    id: inv.id,
    token: inv.token,
    tier: inv.tier,
    url: `https://tap-and-swipe.com/invite/${inv.token}`,
    used: !!inv.usedAt,
    usedAt: inv.usedAt?.toISOString() ?? null,
    discordId: inv.discordId,
    createdAt: inv.createdAt.toISOString(),
  }));

  const serializedLeads = leads.map((l) => ({
    ...l,
    answers: l.answers as Record<string, number> | null,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-[#2a2725] text-[#f1ebe2] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header: tabs + period selector */}
        <div className="flex items-center justify-between mb-6">
          {tabToggle}
          {periodSelector}
        </div>

        {/* 3-column funnel layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* ── Column 1: 1:1 Quiz ── */}
          <div>
            <h3 className="text-base font-bold mb-3 text-[#f4cf8f]">1:1</h3>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
              <FunnelChart funnel={quizFunnel} maxCount={quizMaxCount} benchmarks={BENCHMARKS} benchmarkLabels={BENCHMARK_LABELS} compact />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatCard label="Leads" value={optins} compact />
              <StatCard label="Bookings" value={bookingClicks} compact />
            </div>
            <SourceTable title="Traffic sources" rows={sourceRows("q_traffic")} total={pageViews} compact />
            <div className="mt-4">
              <SourceTable title="Lead sources" rows={sourceRows("q_leads")} total={optins} compact />
            </div>
          </div>

          {/* ── Column 2: Community ── */}
          <div>
            <h3 className="text-base font-bold mb-3 text-[#f4cf8f]">Community</h3>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
              <FunnelChart funnel={communityFunnel} maxCount={cMaxCount} benchmarks={{}} benchmarkLabels={{}} compact />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatCard label="Paid" value={cPaid} compact />
              <StatCard label="Revenue" value={`${(cTotalRevenue / 100).toFixed(0)}€`} compact />
            </div>
            <SourceTable title="Traffic sources" rows={sourceRows("c_traffic")} total={cPageViews} compact />
            <div className="mt-4">
              <SourceTable title="Payment sources" rows={sourceRows("c_payment")} total={cPaid} compact />
            </div>
          </div>

          {/* ── Column 3: ASO web ── */}
          <div>
            <h3 className="text-base font-bold mb-3 text-[#f4cf8f]">ASO</h3>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
              <FunnelChart funnel={asoFunnel} maxCount={aMaxCount} benchmarks={{}} benchmarkLabels={{}} compact />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <StatCard label="Trials" value={aPaid} compact />
              <StatCard label="Potential MRR" value={`${(aTotalRevenue / 100).toFixed(0)}€`} compact />
            </div>
            <SourceTable title="Traffic sources" rows={sourceRows("a_traffic")} total={aPageViews} compact />
            <div className="mt-4">
              <SourceTable title="Payment sources" rows={sourceRows("a_payment")} total={aPaid} compact />
            </div>
          </div>
        </div>

        {/* Leads section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recent leads</h2>
          <InviteModal initialInvites={serializedInvites} />
        </div>
        <LeadTable initialLeads={serializedLeads} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared components
// ═══════════════════════════════════════════════════════════════════════════

interface FunnelStep {
  label: string;
  shortLabel: string;
  count: number;
  rate: number | null;
  benchmark: string | null;
}

function FunnelChart({
  funnel,
  maxCount,
  benchmarks,
  compact,
}: {
  funnel: FunnelStep[];
  maxCount: number;
  benchmarks: Record<string, number>;
  benchmarkLabels: Record<string, string>;
  compact?: boolean;
}) {
  const W = compact ? 600 : 900;
  const H = compact ? 280 : 340;
  const PAD = compact
    ? { top: 28, bottom: 80, left: 40, right: 40 }
    : { top: 28, bottom: 90, left: 50, right: 50 };
  const funnelH = H - PAD.top - PAD.bottom;
  const funnelW = W - PAD.left - PAD.right;
  const centerY = PAD.top + funnelH / 2;
  const n = funnel.length;

  const xs = funnel.map((_, i) => PAD.left + (i / (n - 1)) * funnelW);

  const halfH = funnel.map((f) =>
    maxCount > 0 ? Math.max((f.count / maxCount) * (funnelH / 2), 3) : 3,
  );

  let topPath = `M ${xs[0]},${centerY - halfH[0]}`;
  for (let i = 0; i < n - 1; i++) {
    const cpx = (xs[i] + xs[i + 1]) / 2;
    topPath += ` C ${cpx},${centerY - halfH[i]} ${cpx},${centerY - halfH[i + 1]} ${xs[i + 1]},${centerY - halfH[i + 1]}`;
  }

  let botPath = `L ${xs[n - 1]},${centerY + halfH[n - 1]}`;
  for (let i = n - 1; i > 0; i--) {
    const cpx = (xs[i] + xs[i - 1]) / 2;
    botPath += ` C ${cpx},${centerY + halfH[i]} ${cpx},${centerY + halfH[i - 1]} ${xs[i - 1]},${centerY + halfH[i - 1]}`;
  }
  botPath += " Z";

  const shapePath = topPath + botPath;
  const labelFontSize = compact ? 11 : 12;
  const rateFontSize = compact ? 28 : 30;
  const countFontSize = compact ? 20 : 22;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      <path d={shapePath} fill="rgba(244, 207, 143, 0.25)" />

      {xs.slice(1, -1).map((x, i) => (
        <line
          key={i}
          x1={x}
          y1={PAD.top - 5}
          x2={x}
          y2={H - PAD.bottom + 5}
          stroke="rgba(255,255,255,0.06)"
          strokeDasharray="4 3"
        />
      ))}

      {funnel.map((step, i) => (
        <text
          key={i}
          x={xs[i]}
          y={PAD.top - 10}
          textAnchor="middle"
          fill="#c9c4bc"
          fontSize={labelFontSize}
          fontFamily="sans-serif"
        >
          {compact ? step.shortLabel : step.label}
        </text>
      ))}

      {funnel.map((step, i) => {
        const benchmarkValue = step.benchmark ? benchmarks[step.benchmark] : null;
        const isGood =
          benchmarkValue !== null && step.rate !== null && step.rate >= benchmarkValue;

        if (i === 0) {
          return (
            <g key={i}>
              <text
                x={xs[i]}
                y={H - PAD.bottom + 28}
                textAnchor="middle"
                fill="#f4cf8f"
                fontSize={rateFontSize}
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                {step.count.toLocaleString()}
              </text>
            </g>
          );
        }

        const rateColor = isGood ? "#f4cf8f" : "rgba(244, 207, 143, 0.5)";

        return (
          <g key={i}>
            {step.rate !== null && (
              <text
                x={xs[i]}
                y={H - PAD.bottom + 28}
                textAnchor="middle"
                fill={rateColor}
                fontSize={rateFontSize}
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                {step.rate}%
              </text>
            )}
            <text
              x={xs[i]}
              y={H - PAD.bottom + 54}
              textAnchor="middle"
              fill="rgba(201, 196, 188, 0.6)"
              fontSize={countFontSize}
              fontFamily="sans-serif"
            >
              {step.count.toLocaleString()}
            </text>
            {!compact && benchmarkValue !== null && (
              <text
                x={xs[i]}
                y={H - PAD.bottom + 54}
                textAnchor="middle"
                fill="rgba(201,196,188,0.3)"
                fontSize="9"
                fontFamily="sans-serif"
              >
                goal: {benchmarkValue}%
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function StatCard({ label, value, compact }: { label: string; value: number | string; compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 ${compact ? "p-3" : "p-5"}`}>
      <div className={`text-[#c9c4bc] mb-1 ${compact ? "text-xs" : "text-sm"}`}>{label}</div>
      <div className={`font-bold ${compact ? "text-xl" : "text-3xl"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
    </div>
  );
}

type SourceGroup = "youtube" | "instagram" | "facebook" | "twitter" | "discord" | "google" | "bing" | "duckduckgo" | "brave" | "chatgpt";

const SOURCE_GROUPS: Record<string, { label: string; group: SourceGroup }> = {
  vid1: { label: "Video 1", group: "youtube" },
  vid2: { label: "Video 2", group: "youtube" },
  vid3: { label: "Video 3", group: "youtube" },
  vid4: { label: "Video 4", group: "youtube" },
  vid5: { label: "Video 5", group: "youtube" },
  vid6: { label: "Video 6", group: "youtube" },
  vid7: { label: "Video 7", group: "youtube" },
  vid8: { label: "Video 8", group: "youtube" },
  vid9: { label: "Video 9", group: "youtube" },
  vid10: { label: "Video 10", group: "youtube" },
  "video 1": { label: "Video 1", group: "youtube" },
  "video 2": { label: "Video 2", group: "youtube" },
  "video 3": { label: "Video 3", group: "youtube" },
  "video 4": { label: "Video 4", group: "youtube" },
  "video 5": { label: "Video 5", group: "youtube" },
  "video 6": { label: "Video 6", group: "youtube" },
  "video 7": { label: "Video 7", group: "youtube" },
  "video 8": { label: "Video 8", group: "youtube" },
  "video 9": { label: "Video 9", group: "youtube" },
  "video 10": { label: "Video 10", group: "youtube" },
  ytb_bio: { label: "Bio link", group: "youtube" },
  "youtube.com": { label: "Organic", group: "youtube" },
  "m.youtube.com": { label: "Mobile", group: "youtube" },
  ig: { label: "ig", group: "instagram" },
  "instagram.com": { label: "Organic", group: "instagram" },
  fb: { label: "fb", group: "facebook" },
  "facebook.com": { label: "Organic", group: "facebook" },
  "m.facebook.com": { label: "Mobile", group: "facebook" },
  "l.facebook.com": { label: "Link shim", group: "facebook" },
  "lm.facebook.com": { label: "Mobile link shim", group: "facebook" },
  "t.co": { label: "Organic", group: "twitter" },
  "discord.com": { label: "Organic", group: "discord" },
  "google.com": { label: "Organic", group: "google" },
  "www.google.com": { label: "Organic", group: "google" },
  "bing.com": { label: "Organic", group: "bing" },
  "www.bing.com": { label: "Organic", group: "bing" },
  "duckduckgo.com": { label: "Organic", group: "duckduckgo" },
  "search.brave.com": { label: "Organic", group: "brave" },
  "chatgpt.com": { label: "Organic", group: "chatgpt" },
};

const GROUP_META: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "Twitter/X",
  discord: "Discord",
  google: "Google",
  bing: "Bing",
  duckduckgo: "DuckDuckGo",
  brave: "Brave Search",
  chatgpt: "ChatGPT",
};

function YouTubeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="inline-block mr-1.5 -mt-0.5">
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.5V8.5l6.3 3.5-6.3 3.5z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="inline-block mr-1.5 -mt-0.5">
      <path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zM12 0C8.7 0 8.3 0 7.1.1 5.8.1 4.9.3 4.1.6c-.8.3-1.5.7-2.2 1.4C1.3 2.6.9 3.3.6 4.1.3 4.9.1 5.8.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.1 1.3.2 2.2.6 2.9.3.8.7 1.5 1.4 2.2.7.7 1.4 1.1 2.2 1.4.8.3 1.6.5 2.9.6 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c1.3-.1 2.2-.2 2.9-.6.8-.3 1.5-.7 2.2-1.4.7-.7 1.1-1.4 1.4-2.2.3-.8.5-1.6.6-2.9.1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.1-1.3-.2-2.2-.6-2.9-.3-.8-.7-1.5-1.4-2.2-.7-.7-1.4-1.1-2.2-1.4C19.1.3 18.2.1 16.9.1 15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.4-10.8a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="inline-block mr-1.5 -mt-0.5">
      <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.47h-2.796v8.384C19.612 22.954 24 17.99 24 12z" />
    </svg>
  );
}

function DirectIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="inline-block mr-1.5 -mt-0.5">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="inline-block mr-1.5 -mt-0.5">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="inline-block mr-1.5 -mt-0.5">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="inline-block mr-1.5 -mt-0.5">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function BingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="inline-block mr-1.5 -mt-0.5">
      <path d="M20.176 15.406a6.48 6.48 0 01-1.736 4.414c1.338-1.47.803-3.869-1.003-4.635-.862-.305-2.488-.85-3.367-1.158a1.834 1.834 0 01-.932-.818c-.381-.975-1.163-2.968-1.548-3.948-.095-.285-.31-.625-.265-.938.046-.598.724-1.003 1.276-.754l3.682 1.888c.621.292 1.305.692 1.796 1.172a6.486 6.486 0 012.097 4.777zm-1.44 1.888c-.264-1.194-1.135-1.744-2.216-2.028-1.527.902-4.853 2.878-6.952 4.13-1.103.68-2.13 1.35-2.919 1.242a2.866 2.866 0 01-2.77-2.325c-.012-.048-.008-.03-.001.01a6.4 6.4 0 00.947 2.653 6.498 6.498 0 005.486 3.022c1.908.062 3.536-1.153 5.099-2.096.292-.188.804-.496 1.332-.831l1.423-1.51c.553-.577.764-1.426.571-2.267zm-12.04 2.97c.422 0 .822-.1 1.173-.29.355-.215.964-.579 1.7-1.018L9.57 4.502c0-.99-.497-1.864-1.257-2.382-.08-.059-2.91-1.901-2.99-1.956-.605-.432-1.523.045-1.5.797v14.887l.417 2.36a2.488 2.488 0 002.455 2.056z" fill="#258FFA" />
    </svg>
  );
}

function DuckDuckGoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="inline-block mr-1.5 -mt-0.5">
      <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm0 .984C18.083.984 23.016 5.916 23.016 12S18.084 23.016 12 23.016.984 18.084.984 12C.984 5.917 5.916.984 12 .984zm0 .938C6.434 1.922 1.922 6.434 1.922 12c0 4.437 2.867 8.205 6.85 9.55-.237-.82-.776-2.753-1.6-6.052-1.184-4.741-2.064-8.606 2.379-9.813.047-.011.064-.064.03-.093-.514-.467-1.382-.548-2.233-.38a.06.06 0 0 1-.07-.058c0-.011 0-.023.011-.035.205-.286.572-.507.822-.64a1.843 1.843 0 0 0-.607-.335c-.059-.022-.059-.12-.006-.144.006-.006.012-.012.024-.012 1.749-.233 3.586.292 4.49 1.448.011.011.023.017.035.023 2.968.635 3.509 4.837 3.328 5.998a9.607 9.607 0 0 0 2.346-.576c.746-.286 1.008-.222 1.101-.053.1.193-.018.513-.28.81-.496.567-1.393 1.01-2.974 1.137-.546.044-1.029.024-1.445.006-.789-.035-1.339-.059-1.633.39-.192.298-.041.998 1.487 1.22 1.09.157 2.078.047 2.798-.034.643-.07 1.073-.118 1.172.069.21.402-.996 1.207-3.066 1.224-.158 0-.315-.006-.467-.011-1.283-.065-2.227-.414-2.816-.735a.094.094 0 0 1-.035-.017c-.105-.059-.31.045-.188.267.07.134.444.478 1.004.776-.058.466.087 1.184.338 2l.088-.016c.041-.009.087-.019.134-.025.507-.082.775.012.926.175.717-.536 1.913-1.294 2.03-1.154.583.694.66 2.332.53 2.99-.004.012-.017.024-.04.035-.274.117-1.783-.296-1.783-.511-.059-1.075-.26-1.173-.493-1.225h-.156c.006.006.012.018.018.03l.052.12c.093.257.24 1.063.13 1.26-.112.199-.835.297-1.284.303-.443.006-.543-.158-.637-.408-.07-.204-.103-.675-.103-.95a.857.857 0 0 1 .012-.216c-.134.058-.333.193-.397.281-.017.262-.017.682.123 1.149.07.221-1.518 1.164-1.74.99-.227-.181-.634-1.952-.459-2.67-.187.017-.338.075-.42.191-.367.508.093 2.933.582 3.248.257.169 1.54-.553 2.176-1.095.105.145.305.158.553.158.326-.012.782-.06 1.103-.158.192.45.423.972.613 1.388 4.47-1.032 7.803-5.037 7.803-9.82 0-5.566-4.512-10.078-10.078-10.078zm1.791 5.646c-.42 0-.678.146-.795.332-.023.047.047.094.094.07.14-.075.357-.161.701-.156.328.006.516.09.67.159l.023.01c.041.017.088-.03.059-.065-.134-.18-.332-.35-.752-.35zm-5.078.198a1.24 1.24 0 0 0-.522.082c-.454.169-.67.526-.67.76 0 .051.112.057.141.011.081-.123.21-.31.617-.478.408-.17.73-.146.951-.094.047.012.083-.041.041-.07a.989.989 0 0 0-.558-.211zm5.434 1.423a.651.651 0 0 0-.655.647.652.652 0 0 0 1.307 0 .646.646 0 0 0-.652-.647zm.283.262h.008a.17.17 0 0 1 .17.17c0 .093-.077.17-.17.17a.17.17 0 0 1-.17-.17c0-.09.072-.165.162-.17zm-5.358.076a.752.752 0 0 0-.758.758c0 .42.338.758.758.758s.758-.337.758-.758a.756.756 0 0 0-.758-.758zm.328.303h.01c.112 0 .2.089.2.2 0 .11-.088.197-.2.197a.195.195 0 0 1-.197-.198c0-.107.082-.194.187-.199z" fill="#DE5833" />
    </svg>
  );
}

function BraveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="inline-block mr-1.5 -mt-0.5">
      <path d="M15.68 0l2.096 2.38s1.84-.512 2.709.358c.868.87 1.584 1.638 1.584 1.638l-.562 1.381.715 2.047s-2.104 7.98-2.35 8.955c-.486 1.919-.818 2.66-2.198 3.633-1.38.972-3.884 2.66-4.293 2.916-.409.256-.92.692-1.38.692-.46 0-.97-.436-1.38-.692a185.796 185.796 0 01-4.293-2.916c-1.38-.973-1.712-1.714-2.197-3.633-.247-.975-2.351-8.955-2.351-8.955l.715-2.047-.562-1.381s.716-.768 1.585-1.638c.868-.87 2.708-.358 2.708-.358L8.321 0h7.36z" fill="#FB542B" />
    </svg>
  );
}

function ChatGPTIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="inline-block mr-1.5 -mt-0.5">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" fill="#10A37F" />
    </svg>
  );
}

const GROUP_ICONS: Record<string, () => React.JSX.Element> = {
  youtube: YouTubeIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  twitter: TwitterIcon,
  discord: DiscordIcon,
  google: GoogleIcon,
  bing: BingIcon,
  duckduckgo: DuckDuckGoIcon,
  brave: BraveIcon,
  chatgpt: ChatGPTIcon,
};

function SourceTable({
  title,
  rows,
  total,
  compact,
}: {
  title: string;
  rows: { source: string | null; count: number }[];
  total: number;
  compact?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className={`rounded-2xl border border-white/10 bg-white/5 ${compact ? "p-4" : "p-6"}`}>
        <h3 className={`font-bold mb-3 ${compact ? "text-sm" : "text-lg"}`}>{title}</h3>
        <p className="text-sm text-[#c9c4bc]">No data yet</p>
      </div>
    );
  }

  // Bucket rows into groups
  const groups: Record<string, { source: string | null; label: string; count: number }[]> = {};
  const ungrouped: { source: string | null; count: number }[] = [];

  for (const row of rows) {
    const cfg = row.source ? SOURCE_GROUPS[row.source] : null;
    if (cfg) {
      if (!groups[cfg.group]) groups[cfg.group] = [];
      groups[cfg.group].push({ source: row.source, label: cfg.label, count: row.count });
    } else {
      ungrouped.push(row);
    }
  }

  const sortedGroupKeys = Object.keys(groups).sort(
    (a, b) =>
      groups[b].reduce((s, r) => s + r.count, 0) - groups[a].reduce((s, r) => s + r.count, 0),
  );

  return (
    <div className={`rounded-2xl border border-white/10 bg-white/5 ${compact ? "p-4" : "p-6"}`}>
      <h3 className={`font-bold mb-3 ${compact ? "text-sm" : "text-lg"}`}>{title}</h3>
      <table className={`w-full ${compact ? "text-xs" : "text-sm"}`}>
        <thead>
          <tr className="text-[#c9c4bc] border-b border-white/10">
            <th className="text-left pb-2 font-medium">Source</th>
            <th className="text-right pb-2 font-medium">Count</th>
            {!compact && <th className="text-right pb-2 font-medium">%</th>}
          </tr>
        </thead>
        <tbody>
          {sortedGroupKeys.map((groupKey) => {
            const groupRows = groups[groupKey];
            const groupTotal = groupRows.reduce((s, r) => s + r.count, 0);
            const Icon = GROUP_ICONS[groupKey];

            if (groupRows.length === 1) {
              return (
                <tr key={groupKey} className="border-b border-white/5">
                  <td className="py-1.5">
                    <span className="flex items-center">
                      {Icon && <Icon />}
                      {GROUP_META[groupKey] ?? groupKey}
                    </span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{groupTotal}</td>
                  {!compact && (
                    <td className="py-1.5 text-right tabular-nums text-[#c9c4bc]">
                      {total > 0 ? Math.round((groupTotal / total) * 100) : 0}%
                    </td>
                  )}
                </tr>
              );
            }

            return (
              <ExpandableGroup
                key={groupKey}
                icon={Icon ? <Icon /> : null}
                label={GROUP_META[groupKey] ?? groupKey}
                count={groupTotal}
                pct={total > 0 ? Math.round((groupTotal / total) * 100) : 0}
                subRows={groupRows}
                total={total}
              />
            );
          })}
          {ungrouped.map((row) => (
            <tr key={row.source ?? "__direct"} className="border-b border-white/5">
              <td className="py-1.5">
                <span className="flex items-center">
                  {!row.source && <DirectIcon />}
                  {row.source ?? "Direct"}
                </span>
              </td>
              <td className="py-1.5 text-right tabular-nums">{row.count}</td>
              {!compact && (
                <td className="py-1.5 text-right tabular-nums text-[#c9c4bc]">
                  {total > 0 ? Math.round((row.count / total) * 100) : 0}%
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
