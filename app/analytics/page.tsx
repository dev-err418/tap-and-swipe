import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import LeadTable from "@/components/analytics/LeadTable";

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

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const params = await searchParams;
  const period = (["day", "week", "month", "all"].includes(params.period ?? "")
    ? params.period
    : "week") as Period;

  const gte = getDateFilter(period);
  const where = gte ? { createdAt: { gte } } : {};

  const [
    pageViews,
    quizStarts,
    quizCompletes,
    optins,
    bookingClicks,
    devIndieCount,
    entrepriseCount,
    leads,
  ] = await Promise.all([
    prisma.quizEvent.count({ where: { type: "page_view", ...where } }),
    prisma.quizEvent.count({ where: { type: "quiz_start", ...where } }),
    prisma.quizEvent.count({ where: { type: "quiz_complete", ...where } }),
    prisma.quizLead.count({ where }),
    prisma.quizEvent.count({ where: { type: "booking_click", ...where } }),
    prisma.quizLead.count({ where: { profileType: "dev-indie", ...where } }),
    prisma.quizLead.count({ where: { profileType: "entreprise", ...where } }),
    prisma.quizLead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const devIndiePercent = optins > 0 ? Math.round((devIndieCount / optins) * 100) : 0;
  const entreprisePercent = optins > 0 ? Math.round((entrepriseCount / optins) * 100) : 0;

  // Funnel steps
  const funnel = [
    { label: "Page views", count: pageViews, rate: null as number | null, benchmark: null as string | null },
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

  const serializedLeads = leads.map((l) => ({
    ...l,
    answers: l.answers as Record<string, number> | null,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-[#2a2725] text-[#f1ebe2] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Conversion Funnel */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-10">
          <div className="flex items-center justify-end mb-6">
            <div className="flex gap-1 rounded-xl bg-white/5 p-1">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <Link
                  key={p}
                  href={`/analytics${p === "week" ? "" : `?period=${p}`}`}
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
          </div>

          <FunnelChart funnel={funnel} maxCount={maxCount} benchmarks={BENCHMARKS} benchmarkLabels={BENCHMARK_LABELS} />
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <StatCard label="Leads" value={optins} />
          <StatCard label="Dev Indie" value={devIndieCount} sub={`${devIndiePercent}%`} />
          <StatCard label="Enterprise" value={entrepriseCount} sub={`${entreprisePercent}%`} />
          <StatCard label="Booking clicks" value={bookingClicks} />
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

  // Section boundaries for the vertical grid lines (midpoints between steps)
  const midXs = funnel.slice(1).map((_, i) => (xs[i] + xs[i + 1]) / 2);

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
          // First step: just show the count
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

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-sm text-[#c9c4bc] mb-1">{label}</div>
      <div className="text-3xl font-bold">
        {value}
        {sub && <span className="text-sm text-[#c9c4bc] font-normal ml-1">({sub})</span>}
      </div>
    </div>
  );
}
