import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import LeadTable from "@/components/analytics/LeadTable";
import InviteManager from "@/components/analytics/InviteManager";
import ExpandableGroup from "@/components/analytics/ExpandableGroup";
import LicensesPanel from "@/components/aso-debug/LicensesPanel";
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

type Tab = "quiz" | "community" | "aso";

const TAB_LABELS: Record<Tab, string> = {
  quiz: "1:1",
  community: "Community",
  aso: "ASO",
};

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; tab?: string }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const params = await searchParams;
  const tab = (["quiz", "community", "aso"].includes(params.tab ?? "") ? params.tab : "quiz") as Tab;
  const period = (["day", "week", "month", "all"].includes(params.period ?? "")
    ? params.period
    : "week") as Period;

  const gte = getDateFilter(period);
  const dateWhere = gte ? { createdAt: { gte } } : {};

  function buildUrl(overrides: { period?: Period; tab?: Tab } = {}) {
    const t = overrides.tab ?? tab;
    const p = overrides.period ?? period;
    const sp = new URLSearchParams();
    if (t !== "quiz") sp.set("tab", t);
    if (p !== "week") sp.set("period", p);
    const qs = sp.toString();
    return `/analytics${qs ? `?${qs}` : ""}`;
  }

  // ── Tab toggle (shared) ──
  const tabToggle = (
    <div className="flex gap-1 rounded-xl bg-white/5 p-1 w-fit mb-6">
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
  // ASO Tab
  // ═══════════════════════════════════════════════════════════════════════════
  if (tab === "aso") {
    const pageEventWhere = { product: "aso" as const, ...dateWhere };

    const [aPageViews, aCtaClicked, aStripeShown, aPaid, paidEvents, countryRows] = await Promise.all([
      prisma.pageEvent.count({ where: { ...pageEventWhere, type: "page_view" } }),
      prisma.pageEvent.count({ where: { ...pageEventWhere, type: "cta_clicked" } }),
      prisma.pageEvent.count({ where: { ...pageEventWhere, type: "stripe_shown" } }),
      prisma.pageEvent.count({ where: { ...pageEventWhere, type: "paid" } }),
      prisma.pageEvent.findMany({
        where: { ...pageEventWhere, type: "paid" },
        select: { revenue: true, currency: true, visitorId: true },
      }),
      prisma.pageEvent.groupBy({
        by: ["country"],
        where: { ...pageEventWhere, type: "page_view" },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
    ]);

    const totalRevenue = paidEvents.reduce((sum, e) => sum + (e.revenue ?? 0), 0);
    const conversionRate = aPageViews > 0 ? ((aPaid / aPageViews) * 100).toFixed(1) : "0";

    // Country breakdown: get paid counts per country too
    const countryPaidRows = await prisma.pageEvent.groupBy({
      by: ["country"],
      where: { ...pageEventWhere, type: "paid" },
      _count: { id: true },
    });
    const paidByCountry = Object.fromEntries(countryPaidRows.map((r) => [r.country, r._count.id]));

    // Revenue by country
    const revenueByCountryRows = await prisma.pageEvent.groupBy({
      by: ["country"],
      where: { ...pageEventWhere, type: "paid" },
      _sum: { revenue: true },
    });
    const revenueByCountry = Object.fromEntries(revenueByCountryRows.map((r) => [r.country, r._sum.revenue ?? 0]));

    const asoFunnel: FunnelStep[] = [
      { label: "Page views", count: aPageViews, rate: null, benchmark: null },
      {
        label: "CTA clicked",
        count: aCtaClicked,
        rate: aPageViews > 0 ? Math.round((aCtaClicked / aPageViews) * 100) : 0,
        benchmark: null,
      },
      {
        label: "Stripe shown",
        count: aStripeShown,
        rate: aCtaClicked > 0 ? Math.round((aStripeShown / aCtaClicked) * 100) : 0,
        benchmark: null,
      },
      {
        label: "Paid",
        count: aPaid,
        rate: aStripeShown > 0 ? Math.round((aPaid / aStripeShown) * 100) : 0,
        benchmark: null,
      },
    ];

    const aMaxCount = Math.max(...asoFunnel.map((f) => f.count), 1);

    return (
      <div className="min-h-screen bg-[#2a2725] text-[#f1ebe2] p-8">
        <div className="max-w-6xl mx-auto">
          {tabToggle}

          {/* Funnel */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-10">
            <div className="flex items-center justify-end mb-6">
              {periodSelector}
            </div>
            <FunnelChart funnel={asoFunnel} maxCount={aMaxCount} benchmarks={{}} benchmarkLabels={{}} />
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <StatCard label="Page views" value={aPageViews} />
            <StatCard label="Conversion rate" value={`${conversionRate}%`} />
            <StatCard label="Paid" value={aPaid} />
            <StatCard label="Revenue" value={`${(totalRevenue / 100).toFixed(0)}€`} />
          </div>

          {/* Country breakdown */}
          {countryRows.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-10">
              <h3 className="text-lg font-bold mb-3">Country breakdown</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#c9c4bc] border-b border-white/10">
                    <th className="text-left pb-2 font-medium">Country</th>
                    <th className="text-right pb-2 font-medium">Views</th>
                    <th className="text-right pb-2 font-medium">Paid</th>
                    <th className="text-right pb-2 font-medium">Revenue</th>
                    <th className="text-right pb-2 font-medium">Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {countryRows.map((row) => {
                    const views = row._count.id;
                    const paid = paidByCountry[row.country ?? ""] ?? 0;
                    const rev = revenueByCountry[row.country ?? ""] ?? 0;
                    const conv = views > 0 ? ((paid / views) * 100).toFixed(1) : "0";
                    return (
                      <tr key={row.country ?? "__null"} className="border-b border-white/5">
                        <td className="py-2">{row.country || "Unknown"}</td>
                        <td className="py-2 text-right tabular-nums">{views}</td>
                        <td className="py-2 text-right tabular-nums">{paid}</td>
                        <td className="py-2 text-right tabular-nums">{(rev / 100).toFixed(0)}€</td>
                        <td className="py-2 text-right tabular-nums text-[#c9c4bc]">{conv}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Licenses */}
          <h3 className="text-lg font-bold mb-4">Licenses</h3>
          <div className="mb-10">
            <LicensesPanel />
          </div>

          {/* Proxy Analytics */}
          <h3 className="text-lg font-bold mb-4">Proxy analytics</h3>
          <div className="mb-10">
            <ProxyAnalyticsPanel />
          </div>

          {/* Feedback */}
          <h3 className="text-lg font-bold mb-4">Feedback</h3>
          <div className="mb-10">
            <FeedbackPanel />
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Community Tab
  // ═══════════════════════════════════════════════════════════════════════════
  if (tab === "community") {
    const pageEventWhere = { product: "community" as const, ...dateWhere };

    const [cPageViews, cCtaClicked, cStripeShown, cPaid, cPaidEvents, cCountryRows] = await Promise.all([
      prisma.pageEvent.count({ where: { ...pageEventWhere, type: "page_view" } }),
      prisma.pageEvent.count({ where: { ...pageEventWhere, type: "cta_clicked" } }),
      prisma.pageEvent.count({ where: { ...pageEventWhere, type: "stripe_shown" } }),
      prisma.pageEvent.count({ where: { ...pageEventWhere, type: "paid" } }),
      prisma.pageEvent.findMany({
        where: { ...pageEventWhere, type: "paid" },
        select: { revenue: true, visitorId: true },
      }),
      prisma.pageEvent.groupBy({
        by: ["country"],
        where: { ...pageEventWhere, type: "page_view" },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
    ]);

    const cTotalRevenue = cPaidEvents.reduce((sum, e) => sum + (e.revenue ?? 0), 0);
    const cConversionRate = cPageViews > 0 ? ((cPaid / cPageViews) * 100).toFixed(1) : "0";

    const cCountryPaidRows = await prisma.pageEvent.groupBy({
      by: ["country"],
      where: { ...pageEventWhere, type: "paid" },
      _count: { id: true },
    });
    const cPaidByCountry = Object.fromEntries(cCountryPaidRows.map((r) => [r.country, r._count.id]));

    const cRevenueByCountryRows = await prisma.pageEvent.groupBy({
      by: ["country"],
      where: { ...pageEventWhere, type: "paid" },
      _sum: { revenue: true },
    });
    const cRevenueByCountry = Object.fromEntries(cRevenueByCountryRows.map((r) => [r.country, r._sum.revenue ?? 0]));

    const communityFunnel: FunnelStep[] = [
      { label: "Page views", count: cPageViews, rate: null, benchmark: null },
      {
        label: "CTA clicked",
        count: cCtaClicked,
        rate: cPageViews > 0 ? Math.round((cCtaClicked / cPageViews) * 100) : 0,
        benchmark: null,
      },
      {
        label: "Stripe shown",
        count: cStripeShown,
        rate: cCtaClicked > 0 ? Math.round((cStripeShown / cCtaClicked) * 100) : 0,
        benchmark: null,
      },
      {
        label: "Paid",
        count: cPaid,
        rate: cStripeShown > 0 ? Math.round((cPaid / cStripeShown) * 100) : 0,
        benchmark: null,
      },
    ];

    const cMaxCount = Math.max(...communityFunnel.map((f) => f.count), 1);

    return (
      <div className="min-h-screen bg-[#2a2725] text-[#f1ebe2] p-8">
        <div className="max-w-6xl mx-auto">
          {tabToggle}

          {/* Funnel */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-10">
            <div className="flex items-center justify-end mb-6">
              {periodSelector}
            </div>
            <FunnelChart funnel={communityFunnel} maxCount={cMaxCount} benchmarks={{}} benchmarkLabels={{}} />
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <StatCard label="Page views" value={cPageViews} />
            <StatCard label="Conversion rate" value={`${cConversionRate}%`} />
            <StatCard label="Paid" value={cPaid} />
            <StatCard label="Revenue" value={`${(cTotalRevenue / 100).toFixed(0)}€`} />
          </div>

          {/* Country breakdown */}
          {cCountryRows.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-10">
              <h3 className="text-lg font-bold mb-3">Country breakdown</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#c9c4bc] border-b border-white/10">
                    <th className="text-left pb-2 font-medium">Country</th>
                    <th className="text-right pb-2 font-medium">Views</th>
                    <th className="text-right pb-2 font-medium">Paid</th>
                    <th className="text-right pb-2 font-medium">Revenue</th>
                    <th className="text-right pb-2 font-medium">Conv.</th>
                  </tr>
                </thead>
                <tbody>
                  {cCountryRows.map((row) => {
                    const views = row._count.id;
                    const paid = cPaidByCountry[row.country ?? ""] ?? 0;
                    const rev = cRevenueByCountry[row.country ?? ""] ?? 0;
                    const conv = views > 0 ? ((paid / views) * 100).toFixed(1) : "0";
                    return (
                      <tr key={row.country ?? "__null"} className="border-b border-white/5">
                        <td className="py-2">{row.country || "Unknown"}</td>
                        <td className="py-2 text-right tabular-nums">{views}</td>
                        <td className="py-2 text-right tabular-nums">{paid}</td>
                        <td className="py-2 text-right tabular-nums">{(rev / 100).toFixed(0)}€</td>
                        <td className="py-2 text-right tabular-nums text-[#c9c4bc]">{conv}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Quiz (1:1) Tab — default
  // ═══════════════════════════════════════════════════════════════════════════
  const eventWhere = { ...dateWhere };
  const leadWhere = { ...dateWhere };

  const [
    pageViews,
    quizStarts,
    quizCompletes,
    optins,
    bookingClicks,
    leads,
    eventSourceGroups,
    leadSourceGroups,
    inviteLinks,
  ] = await Promise.all([
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
  ]);

  const funnel: FunnelStep[] = [
    { label: "Page views", count: pageViews, rate: null, benchmark: null },
    {
      label: "Quiz starts",
      count: quizStarts,
      rate: pageViews > 0 ? Math.round((quizStarts / pageViews) * 100) : 0,
      benchmark: "start",
    },
    {
      label: "Quiz completions",
      count: quizCompletes,
      rate: quizStarts > 0 ? Math.round((quizCompletes / quizStarts) * 100) : 0,
      benchmark: "complete",
    },
    {
      label: "Optins",
      count: optins,
      rate: quizCompletes > 0 ? Math.round((optins / quizCompletes) * 100) : 0,
      benchmark: "optin",
    },
    {
      label: "Booking clicks",
      count: bookingClicks,
      rate: optins > 0 ? Math.round((bookingClicks / optins) * 100) : 0,
      benchmark: "booking",
    },
  ];

  const maxCount = Math.max(...funnel.map((f) => f.count), 1);

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
      <div className="max-w-6xl mx-auto">
        {tabToggle}

        {/* Conversion Funnel */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-10">
          <div className="flex items-center justify-end mb-6">
            {periodSelector}
          </div>

          <FunnelChart funnel={funnel} maxCount={maxCount} benchmarks={BENCHMARKS} benchmarkLabels={BENCHMARK_LABELS} />
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          <StatCard label="Leads" value={optins} />
          <StatCard label="Booking clicks" value={bookingClicks} />
          <StatCard label="Page views" value={pageViews} />
        </div>

        {/* Traffic sources */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <SourceTable
            title="Traffic sources (page views)"
            rows={eventSourceGroups.map((g) => ({ source: g.source, count: g._count.id }))}
            total={pageViews}
          />
          <SourceTable
            title="Lead sources"
            rows={leadSourceGroups.map((g) => ({ source: g.source, count: g._count.id }))}
            total={optins}
          />
        </div>

        {/* Invite links */}
        <div className="mb-10">
          <InviteManager initialInvites={serializedInvites} />
        </div>

        {/* Leads table */}
        <h2 className="text-xl font-bold mb-4">Recent leads</h2>
        <LeadTable initialLeads={serializedLeads} />
      </div>
    </div>
  );
}

interface FunnelStep {
  label: string;
  count: number;
  rate: number | null;
  benchmark: string | null;
}

function FunnelChart({
  funnel,
  maxCount,
  benchmarks,
}: {
  funnel: FunnelStep[];
  maxCount: number;
  benchmarks: Record<string, number>;
  benchmarkLabels: Record<string, string>;
}) {
  const W = 900;
  const H = 340;
  const PAD = { top: 28, bottom: 70, left: 30, right: 30 };
  const funnelH = H - PAD.top - PAD.bottom;
  const funnelW = W - PAD.left - PAD.right;
  const centerY = PAD.top + funnelH / 2;
  const n = funnel.length;

  // Each step is a point — evenly spaced across the width
  const xs = funnel.map((_, i) => PAD.left + (i / (n - 1)) * funnelW);

  // Half-heights at each point, proportional to count
  const halfH = funnel.map((f) =>
    maxCount > 0 ? Math.max((f.count / maxCount) * (funnelH / 2), 3) : 3,
  );

  // Build smooth top & bottom curves using cubic bezier
  // Top curve: left to right
  let topPath = `M ${xs[0]},${centerY - halfH[0]}`;
  for (let i = 0; i < n - 1; i++) {
    const cpx = (xs[i] + xs[i + 1]) / 2;
    topPath += ` C ${cpx},${centerY - halfH[i]} ${cpx},${centerY - halfH[i + 1]} ${xs[i + 1]},${centerY - halfH[i + 1]}`;
  }

  // Bottom curve: right to left (mirror)
  let botPath = `L ${xs[n - 1]},${centerY + halfH[n - 1]}`;
  for (let i = n - 1; i > 0; i--) {
    const cpx = (xs[i] + xs[i - 1]) / 2;
    botPath += ` C ${cpx},${centerY + halfH[i]} ${cpx},${centerY + halfH[i - 1]} ${xs[i - 1]},${centerY + halfH[i - 1]}`;
  }
  botPath += " Z";

  const shapePath = topPath + botPath;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Funnel shape — single smooth filled path */}
      <path d={shapePath} fill="rgba(244, 207, 143, 0.25)" />

      {/* Vertical grid lines at each data point (except first & last) */}
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

      {/* Labels on top — step name */}
      {funnel.map((step, i) => (
        <text
          key={i}
          x={xs[i]}
          y={PAD.top - 10}
          textAnchor="middle"
          fill="#c9c4bc"
          fontSize="12"
          fontFamily="sans-serif"
        >
          {step.label}
        </text>
      ))}

      {/* Conversion rate + count below each data point */}
      {funnel.map((step, i) => {
        const benchmarkValue = step.benchmark ? benchmarks[step.benchmark] : null;
        const isGood =
          benchmarkValue !== null && step.rate !== null && step.rate >= benchmarkValue;

        if (i === 0) {
          return (
            <g key={i}>
              <text
                x={xs[i]}
                y={H - PAD.bottom + 24}
                textAnchor="middle"
                fill="#f4cf8f"
                fontSize="16"
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
                y={H - PAD.bottom + 22}
                textAnchor="middle"
                fill={rateColor}
                fontSize="16"
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                {step.rate}%
              </text>
            )}
            <text
              x={xs[i]}
              y={H - PAD.bottom + 40}
              textAnchor="middle"
              fill="rgba(201, 196, 188, 0.6)"
              fontSize="11"
              fontFamily="sans-serif"
            >
              {step.count.toLocaleString()}
            </text>
            {benchmarkValue !== null && (
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

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-sm text-[#c9c4bc] mb-1">{label}</div>
      <div className="text-3xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</div>
    </div>
  );
}

type SourceGroup = "youtube" | "instagram" | "facebook";

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
  ig: { label: "ig", group: "instagram" },
  "instagram.com": { label: "Organic", group: "instagram" },
  fb: { label: "fb", group: "facebook" },
  "facebook.com": { label: "Organic", group: "facebook" },
  "m.facebook.com": { label: "Mobile", group: "facebook" },
  "l.facebook.com": { label: "Link shim", group: "facebook" },
  "lm.facebook.com": { label: "Mobile link shim", group: "facebook" },
};

const GROUP_META: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  facebook: "Facebook",
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

const GROUP_ICONS: Record<string, () => React.JSX.Element> = {
  youtube: YouTubeIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
};

function SourceTable({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { source: string | null; count: number }[];
  total: number;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className="text-lg font-bold mb-3">{title}</h3>
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

  // Sort groups by total count descending
  const sortedGroupKeys = Object.keys(groups).sort(
    (a, b) =>
      groups[b].reduce((s, r) => s + r.count, 0) - groups[a].reduce((s, r) => s + r.count, 0),
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="text-lg font-bold mb-3">{title}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[#c9c4bc] border-b border-white/10">
            <th className="text-left pb-2 font-medium">Source</th>
            <th className="text-right pb-2 font-medium">Count</th>
            <th className="text-right pb-2 font-medium">%</th>
          </tr>
        </thead>
        <tbody>
          {sortedGroupKeys.map((groupKey) => {
            const groupRows = groups[groupKey];
            const groupTotal = groupRows.reduce((s, r) => s + r.count, 0);
            const Icon = GROUP_ICONS[groupKey];

            // Single sub-source: render as a flat row with group icon + name
            if (groupRows.length === 1) {
              return (
                <tr key={groupKey} className="border-b border-white/5">
                  <td className="py-2">
                    <span className="flex items-center">
                      {Icon && <Icon />}
                      {GROUP_META[groupKey] ?? groupKey}
                    </span>
                  </td>
                  <td className="py-2 text-right tabular-nums">{groupTotal}</td>
                  <td className="py-2 text-right tabular-nums text-[#c9c4bc]">
                    {total > 0 ? Math.round((groupTotal / total) * 100) : 0}%
                  </td>
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
              <td className="py-2">
                <span className="flex items-center">
                  {!row.source && <DirectIcon />}
                  {row.source ?? "Direct"}
                </span>
              </td>
              <td className="py-2 text-right tabular-nums">{row.count}</td>
              <td className="py-2 text-right tabular-nums text-[#c9c4bc]">
                {total > 0 ? Math.round((row.count / total) * 100) : 0}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
