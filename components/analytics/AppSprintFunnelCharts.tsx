"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const VISIT_COLOR = "oklch(0.62 0.14 250)";
const REVENUE_COLOR = "#f97316";

export type FunnelTrendPoint = {
  date: string;
  visits: number;
  revenue: number;
  trialStarts: number;
};

export function VisitorsRevenueChart({ data }: { data: FunnelTrendPoint[] }) {
  const hasData = data.some((point) => point.visits > 0 || point.revenue > 0);
  if (!hasData) return <ChartEmpty>Visitor and revenue trends appear after funnel events are tracked.</ChartEmpty>;

  return (
    <>
      <div className="h-72 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 10, bottom: 4, left: 0 }}>
            <defs>
              <linearGradient id="postback-revenue-glass" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={`color-mix(in oklch, ${REVENUE_COLOR}, white 15%)`} />
                <stop offset="1" stopColor={REVENUE_COLOR} />
              </linearGradient>
              <filter id="postback-revenue-shadow" x="-10%" y="-8%" width="120%" height="125%">
                <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.08" />
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,.12)" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={formatChartDate} />
            <YAxis yAxisId="visits" tickLine={false} axisLine={false} width={44} tickFormatter={formatCompactNumber} />
            <YAxis yAxisId="revenue" orientation="right" tickLine={false} axisLine={false} width={50} tickFormatter={formatCompactCurrency} />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: "rgba(0,0,0,.18)", strokeDasharray: "3 3" }} />
            <Bar
              yAxisId="revenue"
              dataKey="revenue"
              name="Revenue"
              fill="url(#postback-revenue-glass)"
              stroke={`color-mix(in oklch, ${REVENUE_COLOR}, black 10%)`}
              strokeWidth={1}
              radius={[4, 4, 0, 0]}
              filter="url(#postback-revenue-shadow)"
              isAnimationActive={false}
            />
            <Line yAxisId="visits" type="monotone" dataKey="visits" name="Visitors" stroke={VISIT_COLOR} strokeWidth={1.9} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend items={[{ label: "Visitors", color: VISIT_COLOR }, { label: "Revenue", color: REVENUE_COLOR }]} />
    </>
  );
}

function TrendTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as FunnelTrendPoint;
  return (
    <TooltipShell label={formatLongDate(String(label))}>
      <TooltipRow color={VISIT_COLOR} label="Visitors" value={formatInteger(row.visits)} />
      <TooltipRow color={REVENUE_COLOR} label="Revenue" value={formatCurrency(row.revenue)} />
      <TooltipRow color="oklch(0.828 0.189 84.429)" label="Trial starts" value={formatInteger(row.trialStarts)} />
    </TooltipShell>
  );
}

type TooltipProps = { active?: boolean; payload?: { payload: unknown }[]; label?: string | number };

function TooltipShell({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="min-w-48 rounded-lg border border-black/20 bg-white p-2.5 text-xs shadow-xl"><p className="mb-2 font-medium">{label}</p><div className="space-y-1.5">{children}</div></div>;
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return <div className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: color }} /><span className="text-black/55">{label}</span><span className="ml-auto font-mono font-medium tabular-nums">{value}</span></div>;
}

function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-black/50">{items.map((item) => <span key={item.label} className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>)}</div>;
}

function ChartEmpty({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-72 items-center justify-center text-center text-sm text-black/45">{children}</div>;
}

function formatChartDate(value: string) {
  const includesTime = value.includes("T");
  return new Intl.DateTimeFormat("en-US", includesTime
    ? { month: "short", day: "numeric", hour: "numeric", timeZone: "UTC" }
    : { month: "short", day: "numeric", timeZone: "UTC" }
  ).format(parseChartDate(value));
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en-US", value.includes("T")
    ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", timeZone: "UTC" }
    : { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }
  ).format(parseChartDate(value));
}

function parseChartDate(value: string) { return new Date(value.includes("T") ? value : `${value}T00:00:00Z`); }

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatCompactCurrency(value: number) {
  return `$${formatCompactNumber(value)}`;
}
