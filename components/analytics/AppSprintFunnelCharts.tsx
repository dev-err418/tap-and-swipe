"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const VISIT_COLOR = "#1d4ed8";
const REVENUE_COLOR = "#f97316";
const REVENUE_STROKE = "color-mix(in oklch, #f97316, black 10%)";
const BAR_RADIUS = 8;

export type FunnelTrendPoint = {
  date: string;
  visits: number;
  revenue: number;
  trialStarts: number;
};

export function VisitorsRevenueChart({ data }: { data: FunnelTrendPoint[] }) {
  const hasData = data.some((point) => point.visits > 0 || point.revenue > 0);
  if (!hasData) {
    return (
      <ChartEmpty>
        Visitor and revenue trends appear after funnel events are tracked.
      </ChartEmpty>
    );
  }

  return (
    <>
      <div className="mb-3 flex min-h-8 items-center justify-center">
        <div
          aria-label="Chart legend"
          className="flex min-w-0 flex-wrap items-center justify-center gap-2 text-[11px]"
        >
          <LegendItem label="Visitors" color={VISIT_COLOR} />
          <LegendItem label="Revenue" color={REVENUE_COLOR} />
        </div>
      </div>
      <div className="h-72 w-full text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            accessibilityLayer
            data={data}
            margin={{ top: 8, right: 4, bottom: 4, left: 4 }}
          >
            <defs>
              <linearGradient id="analytics-visits-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={VISIT_COLOR} stopOpacity={0.22} />
                <stop offset="95%" stopColor={VISIT_COLOR} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={formatChartDate}
            />
            <YAxis
              yAxisId="visits"
              tickLine={false}
              axisLine={false}
              width={42}
              tick={{ fontSize: 12 }}
              tickFormatter={formatCompactNumber}
            />
            <YAxis
              yAxisId="revenue"
              orientation="right"
              tickLine={false}
              axisLine={false}
              width={50}
              tick={{ fontSize: 12 }}
              tickFormatter={formatCompactCurrency}
            />
            <Tooltip
              content={<TrendTooltip />}
              cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
            />
            <Area
              yAxisId="visits"
              type="monotone"
              dataKey="visits"
              stroke="none"
              fill="url(#analytics-visits-fill)"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              legendType="none"
            />
            <Bar
              yAxisId="revenue"
              dataKey="revenue"
              name="Revenue"
              fill={REVENUE_COLOR}
              maxBarSize={34}
              shape={RoundedRevenueBar}
              isAnimationActive={false}
              legendType="none"
            />
            <Line
              yAxisId="visits"
              type="monotone"
              dataKey="visits"
              name="Visitors"
              stroke={VISIT_COLOR}
              strokeWidth={2.25}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={false}
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function LegendItem({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-1 font-medium"
      style={{
        color: `color-mix(in oklch, ${color} 72%, var(--foreground))`,
        backgroundColor: `color-mix(in oklch, ${color} 10%, transparent)`,
        borderColor: `color-mix(in oklch, ${color} 30%, transparent)`,
      }}
    >
      <span
        className="size-2 shrink-0 rounded-[2px]"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function RoundedRevenueBar(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}) {
  const bounds = normalizeBarBounds(props);
  if (!bounds) return <g />;

  const path = roundedBarPath(bounds, BAR_RADIUS, BAR_RADIUS);
  return (
    <g>
      <path d={path} fill={REVENUE_COLOR} fillOpacity={0.88} />
      <path d={path} fill="none" stroke={REVENUE_STROKE} strokeWidth={0.75} />
    </g>
  );
}

function normalizeBarBounds(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}) {
  const { x, y, width, height } = props;
  if (![x, y, width, height].every((value) => Number.isFinite(value))) return null;
  if (width === 0 || height === 0) return null;

  return {
    x: Math.min(x!, x! + width!),
    y: Math.min(y!, y! + height!),
    width: Math.abs(width!),
    height: Math.abs(height!),
  };
}

function roundedBarPath(
  bounds: { x: number; y: number; width: number; height: number },
  requestedTopRadius: number,
  requestedBottomRadius: number,
) {
  const { x, y, width, height } = bounds;
  const right = x + width;
  const bottom = y + height;
  const topRadius = clampBarRadius(requestedTopRadius, width, height);
  const bottomRadius = clampBarRadius(requestedBottomRadius, width, height);

  return [
    `M ${x + topRadius} ${y}`,
    `H ${right - topRadius}`,
    `Q ${right} ${y} ${right} ${y + topRadius}`,
    `V ${bottom - bottomRadius}`,
    `Q ${right} ${bottom} ${right - bottomRadius} ${bottom}`,
    `H ${x + bottomRadius}`,
    `Q ${x} ${bottom} ${x} ${bottom - bottomRadius}`,
    `V ${y + topRadius}`,
    `Q ${x} ${y} ${x + topRadius} ${y}`,
    "Z",
  ].join(" ");
}

function clampBarRadius(radius: number, width: number, height: number) {
  return Math.max(0, Math.min(radius, width / 2, height / 2));
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: FunnelTrendPoint }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="dashboard-tooltip-shadow w-[16rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-popover text-xs text-popover-foreground ring-1 ring-foreground/5">
      <div className="grid gap-2 px-2.5 py-2">
        <div className="font-medium text-foreground">{formatLongDate(String(label ?? row.date))}</div>
        <div className="grid gap-1.5">
          <TooltipMetric label="Visitors" value={formatInteger(row.visits)} color={VISIT_COLOR} />
          <TooltipMetric label="Revenue" value={formatCurrency(row.revenue)} color={REVENUE_COLOR} />
          {row.trialStarts > 0 ? (
            <TooltipMetric
              label="Trial starts"
              value={formatInteger(row.trialStarts)}
              color="oklch(0.828 0.189 84.429)"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TooltipMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between gap-6 text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2 rounded-sm" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="font-mono font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function ChartEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-72 items-center justify-center text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function formatChartDate(value: string) {
  const includesTime = value.includes("T");
  return new Intl.DateTimeFormat("en-US", includesTime
    ? { month: "short", day: "numeric", hour: "numeric", timeZone: "UTC" }
    : { month: "short", day: "numeric", timeZone: "UTC" },
  ).format(parseChartDate(value));
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en-US", value.includes("T")
    ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", timeZone: "UTC" }
    : { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" },
  ).format(parseChartDate(value));
}

function parseChartDate(value: string) {
  return new Date(value.includes("T") ? value : `${value}T00:00:00Z`);
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatCompactCurrency(value: number) {
  return `$${formatCompactNumber(value)}`;
}
