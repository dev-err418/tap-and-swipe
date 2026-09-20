"use client";

import { type KeyboardEvent, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { chartNoteAnchor, chartNoteButtonPosition } from "@/lib/chart-note-anchor";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ZIndexLayer,
  useActiveTooltipLabel,
  usePlotArea,
  useXAxisScale,
} from "recharts";

const VISIT_COLOR = "#1d4ed8";
const REVENUE_COLOR = "#f97316";
const RATE_COLOR = "#16a34a";
const NOTE_COLOR = "#7c3aed";
const REVENUE_STROKE = "color-mix(in oklch, #f97316, black 10%)";
const BAR_RADIUS = 8;

export type FunnelTrendPoint = {
  date: string;
  visits: number;
  revenue: number;
  trialStarts: number;
  rate?: number;
};

export type AnalyticsChartNote = {
  id: string;
  notedAt: string;
  title: string;
  content: string;
  appVersion: string;
};

export function VisitorsRevenueChart({
  data,
  visitLabel = "Visitors",
  revenueLabel = "Revenue",
  rateLabel,
  timeZone = "UTC",
  notes = [],
  action,
  onAddNote,
  onNoteClick,
  emptyMessage = "Visitor and revenue trends appear after funnel events are tracked.",
}: {
  data: FunnelTrendPoint[];
  visitLabel?: string;
  revenueLabel?: string;
  rateLabel?: string;
  timeZone?: string;
  notes?: AnalyticsChartNote[];
  action?: ReactNode;
  onAddNote?: (date: string) => void;
  onNoteClick?: (note: AnalyticsChartNote) => void;
  emptyMessage?: string;
}) {
  const hasRate = Boolean(rateLabel) && data.some((point) => point.rate !== undefined);
  const hasData = data.some((point) => point.visits > 0 || point.revenue > 0 || (point.rate ?? 0) > 0);
  const chartData = data.map((point) => ({
    ...point,
    timestamp: parseChartDate(point.date).getTime(),
  })).filter((point) => Number.isFinite(point.timestamp));
  const timestamps = chartData.map((point) => point.timestamp).filter(Number.isFinite);
  const firstTimestamp = Math.min(...timestamps);
  const lastTimestamp = Math.max(...timestamps);
  const bucketWidths = timestamps
    .slice(1)
    .map((timestamp, index) => timestamp - timestamps[index])
    .filter((width) => width > 0);
  const bucketWidth = bucketWidths.length > 0 ? Math.min(...bucketWidths) : 60 * 60 * 1_000;
  const xDomain: [number, number] = firstTimestamp === lastTimestamp
    ? [firstTimestamp - 30 * 60 * 1_000, lastTimestamp + 30 * 60 * 1_000]
    : [firstTimestamp, lastTimestamp + bucketWidth];
  const visibleNotes = notes.filter((note) => {
    const timestamp = Date.parse(note.notedAt);
    return Number.isFinite(timestamp) && timestamp >= xDomain[0] && timestamp <= xDomain[1];
  });

  if (timestamps.length === 0 || (!hasData && !onAddNote)) {
    return (
      <>
        {action ? <div className="mb-3 flex min-h-8 justify-end">{action}</div> : null}
        <ChartEmpty>{emptyMessage}</ChartEmpty>
        {onAddNote ? (
          <div className="flex justify-end">
            <button
              type="button"
              aria-label="Add chart note"
              onClick={() => onAddNote(new Date().toISOString())}
              className="flex size-8 items-center justify-center rounded-full border border-violet-200 text-violet-600 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-500"
            >
              <Plus size={16} aria-hidden />
            </button>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="mb-3 grid min-h-8 grid-cols-[1fr_auto_1fr] items-center gap-3">
        <span aria-hidden />
        <div
          aria-label="Chart legend"
          className="flex min-w-0 flex-wrap items-center justify-center gap-2 text-[11px]"
        >
          <LegendItem label={visitLabel} color={VISIT_COLOR} />
          <LegendItem label={revenueLabel} color={REVENUE_COLOR} />
          {hasRate && rateLabel ? <LegendItem label={rateLabel} color={RATE_COLOR} /> : null}
          {visibleNotes.length > 0 ? <LegendItem label="Notes" color={NOTE_COLOR} /> : null}
        </div>
        <div className="flex justify-end">{action}</div>
      </div>
      <div className="h-72 w-full text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            accessibilityLayer
            data={chartData}
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
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={xDomain}
              allowDataOverflow
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={(value: number) => formatChartDate(value, timeZone)}
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
              domain={[0, "auto"]}
              allowDataOverflow
              tickLine={false}
              axisLine={false}
              width={50}
              tick={{ fontSize: 12 }}
              tickFormatter={formatCompactCurrency}
            />
            {hasRate ? <YAxis yAxisId="rate" domain={[0, 1]} hide /> : null}
            <Tooltip
              content={<TrendTooltip visitLabel={visitLabel} revenueLabel={revenueLabel} rateLabel={rateLabel} timeZone={timeZone} />}
              cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
            />
            {visibleNotes.map((note) => (
              <ReferenceLine
                key={note.id}
                x={Date.parse(note.notedAt)}
                yAxisId="visits"
                stroke={NOTE_COLOR}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                ifOverflow="hidden"
                zIndex={500}
                label={(
                  <NoteMarker
                    note={note}
                    onClick={onNoteClick}
                  />
                )}
              />
            ))}
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
              name={revenueLabel}
              fill={REVENUE_COLOR}
              maxBarSize={34}
              shape={<RoundedRevenueBar />}
              isAnimationActive={false}
              legendType="none"
            />
            <Line
              yAxisId="visits"
              type="monotone"
              dataKey="visits"
              name={visitLabel}
              stroke={VISIT_COLOR}
              strokeWidth={2.25}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={false}
              legendType="none"
            />
            {hasRate ? (
              <Line
                yAxisId="rate"
                type="monotone"
                dataKey="rate"
                name={rateLabel}
                stroke={RATE_COLOR}
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
                connectNulls
                isAnimationActive={false}
                legendType="none"
              />
            ) : null}
            {onAddNote ? <ChartNoteButton points={chartData} onAddNote={onAddNote} timeZone={timeZone} /> : null}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

function ChartNoteButton({
  points,
  onAddNote,
  timeZone,
}: {
  points: readonly { date: string; timestamp: number }[];
  onAddNote: (date: string) => void;
  timeZone: string;
}) {
  // Axis-level hover also works over lines, gaps and zero-revenue dates.
  const activeLabel = useActiveTooltipLabel();
  const plot = usePlotArea();
  const xScale = useXAxisScale();
  const point = chartNoteAnchor(points, activeLabel);
  const dateX = point ? xScale?.(point.timestamp) : undefined;
  if (!point || !plot || dateX === undefined || !Number.isFinite(dateX)) return null;
  const { x, y } = chartNoteButtonPosition(plot, dateX);

  return (
    <ZIndexLayer zIndex={600}>
      <foreignObject x={x - 14} y={y - 14} width={28} height={28}>
        <button
          type="button"
          aria-label={`Add note for ${formatLongDate(point.date, timeZone)}`}
          title={`Add note for ${formatLongDate(point.date, timeZone)}`}
          onClick={(event) => {
            event.stopPropagation();
            onAddNote(point.date);
          }}
          onKeyDown={(event) => event.stopPropagation()}
          className="flex size-7 cursor-pointer items-center justify-center rounded-full border border-violet-300 bg-white text-violet-600 shadow-sm hover:bg-violet-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-violet-600"
        >
          <Plus size={14} aria-hidden />
        </button>
      </foreignObject>
    </ZIndexLayer>
  );
}

function NoteMarker({
  note,
  onClick,
  viewBox,
}: {
  note: AnalyticsChartNote;
  onClick?: (note: AnalyticsChartNote) => void;
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
}) {
  const x = (viewBox?.x ?? 0) + (viewBox?.width ?? 0) / 2;
  const y = (viewBox?.y ?? 0) + 7;
  const openNote = () => onClick?.(note);
  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openNote();
  };

  return (
    <g
      role="button"
      aria-label={`Open chart note: ${note.title}, app version ${note.appVersion}`}
      tabIndex={0}
      onClick={openNote}
      onKeyDown={handleKeyDown}
      className="cursor-pointer outline-none"
    >
      <rect x={x - 105} y={y - 8} width={210} height={52} fill="transparent" />
      <NoteLabel x={x} y={y} note={note} />
    </g>
  );
}

function NoteLabel({ x, y, note }: { x: number; y: number; note: AnalyticsChartNote }) {
  const title = truncateLabel(note.title, 28);
  const version = formatAppVersion(note.appVersion);
  const labelWidth = Math.max(88, Math.min(190, Math.max(title.length * 6.2, version.length * 5.4) + 22));
  const labelHeight = 36;

  return (
    <g aria-hidden="true" className="pointer-events-none">
      <rect
        x={x - labelWidth / 2}
        y={y - 7}
        width={labelWidth}
        height={labelHeight}
        rx={9}
        fill="white"
        stroke={NOTE_COLOR}
        strokeOpacity={0.32}
      />
      <text x={x} y={y + 7} textAnchor="middle" fill="#171717" fontSize={10.5} fontWeight={600}>
        {title}
      </text>
      <text x={x} y={y + 21} textAnchor="middle" fill={NOTE_COLOR} fontSize={9.5} fontWeight={600}>
        {version}
      </text>
      <circle cx={x} cy={y + labelHeight} r={5.5} fill={NOTE_COLOR} stroke="white" strokeWidth={2} />
    </g>
  );
}

function truncateLabel(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}

function formatAppVersion(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "unknown") return "Unknown version";
  return /^v/i.test(trimmed) ? trimmed : `v${trimmed}`;
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
  visitLabel = "Visitors",
  revenueLabel = "Revenue",
  rateLabel,
  timeZone,
}: {
  active?: boolean;
  payload?: { payload: FunnelTrendPoint }[];
  label?: string | number;
  visitLabel?: string;
  revenueLabel?: string;
  rateLabel?: string;
  timeZone: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="dashboard-tooltip-shadow w-[16rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-popover text-xs text-popover-foreground ring-1 ring-foreground/5">
      <div className="grid gap-2 px-2.5 py-2">
        <div className="font-medium text-foreground">{formatLongDate(label ?? row.date, timeZone)}</div>
        <div className="grid gap-1.5">
          <TooltipMetric label={visitLabel} value={formatInteger(row.visits)} color={VISIT_COLOR} />
          <TooltipMetric label={revenueLabel} value={formatCurrency(row.revenue)} color={REVENUE_COLOR} />
          {rateLabel && row.rate !== undefined ? (
            <TooltipMetric label={rateLabel} value={formatRate(row.rate)} color={RATE_COLOR} />
          ) : null}
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

function formatChartDate(value: string | number, timeZone: string) {
  const includesTime = typeof value === "number" || value.includes("T");
  return new Intl.DateTimeFormat("en-US", includesTime
    ? { month: "short", day: "numeric", hour: "numeric", timeZone, ...(timeZone === "Europe/Paris" ? { hourCycle: "h23" as const } : {}) }
    : { month: "short", day: "numeric", timeZone },
  ).format(parseChartDate(value));
}

function formatLongDate(value: string | number, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", typeof value === "number" || value.includes("T")
    ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", timeZone, ...(timeZone === "Europe/Paris" ? { hourCycle: "h23" as const, minute: "2-digit" as const, timeZoneName: "shortOffset" as const } : {}) }
    : { month: "short", day: "numeric", year: "numeric", timeZone },
  ).format(parseChartDate(value));
}

function parseChartDate(value: string | number) {
  if (typeof value === "number") return new Date(value);
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

function formatRate(value: number) {
  return `${(value * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}
