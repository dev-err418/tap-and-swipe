"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrialCancelTiming } from "@/lib/mobile-app-analytics";
import { DashboardCard } from "@/components/analytics/DashboardCard";

const SURVIVAL_COLOR = "#1d4ed8";
const QUALIFIED_COLOR = "#f97316";

const BUCKET_MINUTES: Record<string, number> = {
  "0-5m": 5,
  "5-10m": 10,
  "10-15m": 15,
  "15-30m": 30,
  "30-60m": 60,
  "60-120m": 120,
  "2-6h": 6 * 60,
  "6-12h": 12 * 60,
  "12-24h": 24 * 60,
  "1-2d": 48 * 60,
  "2-3d": 72 * 60,
};

const QUALIFIED_MINUTES = 15;
const DETAIL_MINUTES = 30;
const TIME_TICKS = [0, 5, 10, 15, 30, 60, 6 * 60, 24 * 60, 72 * 60];

export default function TrialCancelChart({
  timing,
  windowLabel,
}: {
  timing: TrialCancelTiming;
  windowLabel: string;
}) {
  const data = survivalPoints(timing);
  const stillAtQualified = timing.trials - timing.cancelledBeforeQualified;
  const stillAtQualifiedRate = timing.trials > 0 ? stillAtQualified / timing.trials : 0;
  const laterCancels = Math.max(0, timing.cancelled - timing.cancelledBeforeQualified);

  return (
    <DashboardCard
      title="Trial survival"
      action={<span className="text-xs text-muted-foreground">{windowLabel}</span>}
      contentClassName="min-w-0"
    >
      <div className="mb-4 grid grid-cols-3 gap-3 text-xs">
        <Stat
          label="Still in trial at 15m"
          value={formatPercent(stillAtQualifiedRate)}
          detail={`${formatInt(stillAtQualified)} of ${formatInt(timing.trials)} would qualify`}
          accent
        />
        <Stat
          label="Cancelled before 15m"
          value={formatInt(timing.cancelledBeforeQualified)}
          detail="Never reach Trial Qualified"
        />
        <Stat
          label="Cancelled 15m–3d"
          value={formatInt(laterCancels)}
          detail="After Trial Qualified"
        />
      </div>
      {timing.trials > 0 ? (
        <div className="h-64 w-full text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart accessibilityLayer data={data} margin={{ top: 10, right: 12, bottom: 4, left: 0 }}>
              <defs>
                <linearGradient id="trial-survival-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SURVIVAL_COLOR} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={SURVIVAL_COLOR} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="t"
                type="number"
                domain={[0, 100]}
                ticks={TIME_TICKS.map(warpTime)}
                tickFormatter={(value: number) => formatWarpedTick(value)}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(value: number) => `${value}%`}
                tickLine={false}
                axisLine={false}
                width={40}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<SurvivalTooltip trials={timing.trials} />} />
              <ReferenceLine
                x={warpTime(QUALIFIED_MINUTES)}
                stroke={QUALIFIED_COLOR}
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "Trial Qualified",
                  position: "insideTopLeft",
                  fill: QUALIFIED_COLOR,
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
              <Area
                type="stepAfter"
                dataKey="remainingPct"
                stroke="none"
                fill="url(#trial-survival-fill)"
                isAnimationActive={false}
              />
              <Line
                type="stepAfter"
                dataKey="remainingPct"
                stroke={SURVIVAL_COLOR}
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: SURVIVAL_COLOR }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Trial survival appears after Superwall trial events are tracked.
        </p>
      )}
    </DashboardCard>
  );
}

function survivalPoints(timing: TrialCancelTiming) {
  let remaining = timing.trials;
  const points = [
    {
      t: 0,
      minutes: 0,
      label: "Start",
      remaining,
      remainingPct: 100,
      cancels: 0,
      qualified: false,
    },
  ];
  for (const bucket of timing.buckets) {
    remaining = Math.max(0, remaining - bucket.cancels);
    const minutes = BUCKET_MINUTES[bucket.key] ?? 0;
    points.push({
      t: warpTime(minutes),
      minutes,
      label: bucket.label,
      remaining,
      remainingPct: timing.trials > 0 ? (remaining / timing.trials) * 100 : 0,
      cancels: bucket.cancels,
      qualified: bucket.highlight === true,
    });
  }
  return points;
}

function warpTime(minutes: number) {
  if (minutes <= DETAIL_MINUTES) return (minutes / DETAIL_MINUTES) * 50;
  return 50 + ((minutes - DETAIL_MINUTES) / (72 * 60 - DETAIL_MINUTES)) * 50;
}

function formatWarpedTick(t: number) {
  const minutes =
    t <= 50 ? (t / 50) * DETAIL_MINUTES : DETAIL_MINUTES + ((t - 50) / 50) * (72 * 60 - DETAIL_MINUTES);
  if (minutes <= 0) return "0";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 24 * 60) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / (24 * 60))}d`;
}

function SurvivalTooltip({
  active,
  payload,
  trials,
}: {
  active?: boolean;
  payload?: {
    payload: {
      label: string;
      remaining: number;
      remainingPct: number;
      cancels: number;
      qualified: boolean;
    };
  }[];
  trials: number;
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <div className="dashboard-tooltip-shadow w-[16rem] overflow-hidden rounded-xl bg-popover text-xs text-popover-foreground ring-1 ring-foreground/5">
      <div className="grid gap-2 px-2.5 py-2">
        <div className="font-medium text-foreground">
          {point.label}
          {point.qualified ? " · Trial Qualified" : ""}
        </div>
        <div className="grid gap-1.5 text-muted-foreground">
          <TooltipRow label="Still in trial" value={`${formatInt(point.remaining)} · ${point.remainingPct.toFixed(0)}%`} />
          <TooltipRow label="Cancelled in this window" value={formatInt(point.cancels)} />
          <TooltipRow
            label="Cancelled so far"
            value={formatInt(Math.max(0, trials - point.remaining))}
          />
        </div>
      </div>
    </div>
  );
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span>{label}</span>
      <span className="font-mono font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-lg font-semibold tabular-nums ${accent ? "text-[#1d4ed8]" : "text-black"}`}>
        {value}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}

function formatInt(value: number) {
  return value.toLocaleString("en-US");
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(0)}%`;
}
