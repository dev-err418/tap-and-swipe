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

  const eventWhere = { ...dateWhere };
  const leadWhere = { ...dateWhere };
  const communityEventWhere = { product: "community" as const, ...dateWhere };
  const asoEventWhere = { product: "aso" as const, ...dateWhere };

  const [
    // 1:1 Quiz
    pageViews,
    quizStarts,
    quizCompletes,
    optins,
    bookingClicks,
    leads,
    eventSourceGroups,
    leadSourceGroups,
    inviteLinks,
    // Community
    cPageViews,
    cCtaClicked,
    cStripeShown,
    cPaid,
    cPaidEvents,
    cSourceGroups,
    // ASO
    aPageViews,
    aCtaClicked,
    aStripeShown,
    aPaid,
    aPaidEvents,
    aSourceGroups,
    // Payment sources
    cPaymentSources,
    aPaymentSources,
  ] = await Promise.all([
    // 1:1 Quiz queries
    prisma.quizEvent.count({ where: { type: "page_view", ...eventWhere } }),
    prisma.quizEvent.count({ where: { type: "quiz_start", ...eventWhere } }),
    prisma.quizEvent.count({ where: { type: "quiz_complete", ...eventWhere } }),
    prisma.quizLead.count({ where: leadWhere }),
    prisma.quizEvent.count({ where: { type: "booking_click", ...eventWhere } }),
    prisma.quizLead.findMany({
      where: leadWhere,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.quizEvent.groupBy({
      by: ["source"],
      where: { type: "page_view", ...eventWhere },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.quizLead.groupBy({
      by: ["source"],
      where: leadWhere,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.inviteLink.findMany({
      orderBy: { createdAt: "desc" },
    }),
    // Community queries
    prisma.pageEvent.count({ where: { ...communityEventWhere, type: "page_view" } }),
    prisma.pageEvent.count({ where: { ...communityEventWhere, type: "cta_clicked" } }),
    prisma.pageEvent.count({ where: { ...communityEventWhere, type: "stripe_shown" } }),
    prisma.pageEvent.count({ where: { ...communityEventWhere, type: "paid" } }),
    prisma.pageEvent.findMany({
      where: { ...communityEventWhere, type: "paid" },
      select: { revenue: true, visitorId: true },
    }),
    prisma.pageEvent.groupBy({
      by: ["referrer"],
      where: { ...communityEventWhere, type: "page_view" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    // ASO queries
    prisma.pageEvent.count({ where: { ...asoEventWhere, type: "page_view" } }),
    prisma.pageEvent.count({ where: { ...asoEventWhere, type: "cta_clicked" } }),
    prisma.pageEvent.count({ where: { ...asoEventWhere, type: "stripe_shown" } }),
    prisma.pageEvent.count({ where: { ...asoEventWhere, type: "trial_started" } }),
    prisma.pageEvent.findMany({
      where: { ...asoEventWhere, type: "trial_started" },
      select: { revenue: true, visitorId: true },
    }),
    prisma.pageEvent.groupBy({
      by: ["referrer"],
      where: { ...asoEventWhere, type: "page_view" },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
    // Payment sources: join paid/trial events back to page_view referrer
    prisma.$queryRaw<{ referrer: string | null; count: bigint }[]>`
      SELECT pv.referrer, COUNT(DISTINCT pv."visitorId")::bigint as count
      FROM "PageEvent" pv
      INNER JOIN "PageEvent" paid ON paid."visitorId" = pv."visitorId"
        AND paid.product = 'community' AND paid.type = 'paid'
        AND paid."createdAt" >= ${gte ?? new Date('2000-01-01')}
      WHERE pv.product = 'community' AND pv.type = 'page_view'
      GROUP BY pv.referrer
      ORDER BY count DESC
    `,
    prisma.$queryRaw<{ referrer: string | null; count: bigint }[]>`
      SELECT pv.referrer, COUNT(DISTINCT pv."visitorId")::bigint as count
      FROM "PageEvent" pv
      INNER JOIN "PageEvent" trial ON trial."visitorId" = pv."visitorId"
        AND trial.product = 'aso' AND trial.type = 'trial_started'
        AND trial."createdAt" >= ${gte ?? new Date('2000-01-01')}
      WHERE pv.product = 'aso' AND pv.type = 'page_view'
      GROUP BY pv.referrer
      ORDER BY count DESC
    `,
  ]);

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
  const cTotalRevenue = cPaidEvents.reduce((sum, e) => sum + (e.revenue ?? 0), 0);
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
  const aTotalRevenue = aPaidEvents.reduce((sum, e) => sum + (e.revenue ?? 0), 0);
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
            <SourceTable
              title="Traffic sources"
              rows={eventSourceGroups.map((g) => ({ source: g.source, count: g._count.id }))}
              total={pageViews}
              compact
            />
            <div className="mt-4">
              <SourceTable
                title="Lead sources"
                rows={leadSourceGroups.map((g) => ({ source: g.source, count: g._count.id }))}
                total={optins}
                compact
              />
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
            <SourceTable
              title="Traffic sources"
              rows={cSourceGroups.map((g) => ({ source: g.referrer, count: g._count.id }))}
              total={cPageViews}
              compact
            />
            <div className="mt-4">
              <SourceTable
                title="Payment sources"
                rows={cPaymentSources.map((r) => ({ source: r.referrer, count: Number(r.count) }))}
                total={cPaid}
                compact
              />
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
            <SourceTable
              title="Traffic sources"
              rows={aSourceGroups.map((g) => ({ source: g.referrer, count: g._count.id }))}
              total={aPageViews}
              compact
            />
            <div className="mt-4">
              <SourceTable
                title="Payment sources"
                rows={aPaymentSources.map((r) => ({ source: r.referrer, count: Number(r.count) }))}
                total={aPaid}
                compact
              />
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

type SourceGroup = "youtube" | "instagram" | "facebook" | "twitter" | "discord";

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
};

const GROUP_META: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "Twitter/X",
  discord: "Discord",
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

const GROUP_ICONS: Record<string, () => React.JSX.Element> = {
  youtube: YouTubeIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  twitter: TwitterIcon,
  discord: DiscordIcon,
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
