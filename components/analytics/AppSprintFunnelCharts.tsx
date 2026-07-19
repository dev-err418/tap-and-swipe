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
const REVENUE_COLOR = "oklch(0.852 0.199 91.936)";
const RATE_COLOR = "oklch(0.769 0.188 70.08)";

export type FunnelTrendPoint = {
  date: string;
  visits: number;
  revenue: number;
  trialStarts: number;
};

export type PaidConversionPoint = {
  date: string;
  maturedTrials: number;
  paidConversions: number;
  paidConversionRate: number | null;
};

export function VisitorsRevenueChart({ data }: { data: FunnelTrendPoint[] }) {
  const hasData = data.some((point) => point.visits > 0 || point.revenue > 0);
  if (!hasData) return <ChartEmpty>Visitor and revenue trends appear after funnel events are tracked.</ChartEmpty>;

  return (
    <>
      <div className="h-72 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 10, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,.12)" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={formatChartDate} />
            <YAxis yAxisId="visits" tickLine={false} axisLine={false} width={44} tickFormatter={formatCompactNumber} />
            <YAxis yAxisId="revenue" orientation="right" tickLine={false} axisLine={false} width={50} tickFormatter={formatCompactCurrency} />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: "rgba(0,0,0,.18)", strokeDasharray: "3 3" }} />
            <Bar yAxisId="revenue" dataKey="revenue" name="Revenue" fill={REVENUE_COLOR} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Line yAxisId="visits" type="monotone" dataKey="visits" name="Visitors" stroke={VISIT_COLOR} strokeWidth={1.9} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend items={[{ label: "Visitors", color: VISIT_COLOR }, { label: "Revenue", color: REVENUE_COLOR }]} />
    </>
  );
}

export function PaidConversionRateChart({ data }: { data: PaidConversionPoint[] }) {
  const hasData = data.some((point) => point.maturedTrials > 0);
  if (!hasData) return <ChartEmpty small>Paid conversion rate appears after 14-day trial cohorts mature.</ChartEmpty>;

  return (
    <>
      <div className="h-56 w-full text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 10, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,.12)" />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tickFormatter={formatChartDate} />
            <YAxis tickLine={false} axisLine={false} width={46} tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`} />
            <Tooltip content={<RateTooltip />} cursor={{ stroke: "rgba(0,0,0,.18)", strokeDasharray: "3 3" }} />
            <Line type="monotone" dataKey="paidConversionRate" name="Paid conversion rate" stroke={RATE_COLOR} strokeWidth={2} dot={false} connectNulls activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ChartLegend items={[{ label: "Paid conversion rate", color: RATE_COLOR }]} />
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

function RateTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as PaidConversionPoint;
  return (
    <TooltipShell label={formatLongDate(String(label))}>
      <TooltipRow color={RATE_COLOR} label="Paid conversion rate" value={row.paidConversionRate == null ? "-" : `${(row.paidConversionRate * 100).toFixed(1)}%`} />
      <TooltipRow color="rgba(0,0,0,.45)" label="Matured trials" value={formatInteger(row.maturedTrials)} />
      <TooltipRow color={REVENUE_COLOR} label="Paid conversions" value={formatInteger(row.paidConversions)} />
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

function ChartEmpty({ children, small = false }: { children: React.ReactNode; small?: boolean }) {
  return <div className={`flex items-center justify-center text-center text-sm text-black/45 ${small ? "min-h-56" : "min-h-72"}`}>{children}</div>;
}

function formatChartDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

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
