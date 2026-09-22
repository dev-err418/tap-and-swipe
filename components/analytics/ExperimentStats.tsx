"use client";

import { useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import type { ExperimentAnalysis, ExperimentReadiness, VariantExperimentResult } from "@/lib/experiment-stats";
import { cn } from "@/lib/utils";

const WIN_COLOR = "#1d4ed8";
const LOSE_COLOR = "#f97316";
const WIN_SOFT = "color-mix(in oklch, #1d4ed8 12%, white)";
const LOSE_SOFT = "color-mix(in oklch, #f97316 14%, white)";

export function ExperimentWarningBadge({ analysis }: { analysis: ExperimentAnalysis }) {
  if (analysis.sufficientData) return null;
  return (
    <span
      className="inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium"
      style={{ color: LOSE_COLOR, backgroundColor: LOSE_SOFT }}
    >
      {analysis.reason ?? "Not enough data yet."}
    </span>
  );
}

export default function ExperimentStats({
  analysis,
  title,
  titleClassName,
  showReadiness = true,
  historical = false,
}: {
  analysis: ExperimentAnalysis;
  title?: string;
  titleClassName?: string;
  showReadiness?: boolean;
  historical?: boolean;
}) {
  if (analysis.variants.length === 0) return null;
  const leaderKey = uniqueChanceKey(analysis.variants, "max");
  const trailingKey = uniqueChanceKey(analysis.variants, "min");
  const bound = intervalBound(analysis.variants);
  const readiness = historical ? {
    ...analysis.readiness,
    status: analysis.readiness.status === "decisive" ? "inconclusive" as const : analysis.readiness.status,
    estimatedDaysRemaining: null,
    estimatedCompletionAt: null,
  } : analysis.readiness;
  return (
    <div className="border-b border-black/[0.08] px-4 py-4">
      {title || showReadiness ? (
        <div className="mb-3 flex items-center gap-2">
          {title ? <p className={cn("text-xs font-semibold text-black", titleClassName)}>{title}</p> : null}
          {showReadiness ? <ReadinessIndicator readiness={readiness} /> : null}
        </div>
      ) : null}
      <div className="grid gap-6 sm:grid-cols-2">
        {analysis.variants.map((variant) => (
          <VariantChance
            key={variant.key}
            variant={variant}
            bound={bound}
            isLeader={variant.key === leaderKey}
            isTrailing={variant.key === trailingKey}
          />
        ))}
      </div>
    </div>
  );
}

export function ReadinessIndicator({ readiness }: { readiness: ExperimentReadiness }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const label = readiness.status === "decisive" ? "Decisive"
    : readiness.status === "inconclusive" ? "Inconclusive"
      : readiness.status === "collecting" ? "Collecting data"
        : "Planning pending";
  const statusColor = readiness.status === "decisive" ? WIN_COLOR
    : readiness.status === "inconclusive" ? LOSE_COLOR
      : "#525252";
  const completion = readiness.estimatedCompletionAt
    ? `around ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "Europe/Paris" }).format(new Date(readiness.estimatedCompletionAt))}`
    : readiness.estimatedDaysRemaining != null && readiness.estimatedDaysRemaining > 0
      ? `about ${readiness.estimatedDaysRemaining.toLocaleString("en-US")} days`
      : readiness.estimatedDaysRemaining === 0 ? "target reached" : null;

  const reportedProgress = readiness.progress == null ? 0 : Math.max(0, readiness.progress);
  const ringProgress = Math.min(1, reportedProgress);
  const radius = 8;
  const circumference = 2 * Math.PI * radius;
  const ariaLabel = readiness.required == null
    ? `${label}. ${readiness.reason ?? "Sample target unavailable."}`
    : `${label}. ${Math.round(reportedProgress * 100)}% of the total participant target: ${formatCount(readiness.observed)} of ${formatCount(readiness.required)} participants.${readiness.remaining ? ` ${formatCount(readiness.remaining)} more needed in underfilled variants.` : ""}`;
  const showFromFocus = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setTooltip({ x: rect.left + rect.width / 2, y: rect.bottom });
  };

  return <>
    <button
      type="button"
      className="inline-flex size-6 shrink-0 cursor-help items-center justify-center rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-[#1d4ed8]/40"
      aria-label={ariaLabel}
      onPointerEnter={(event) => setTooltip({ x: event.clientX, y: event.clientY })}
      onPointerMove={(event) => setTooltip({ x: event.clientX, y: event.clientY })}
      onPointerLeave={() => setTooltip(null)}
      onFocus={(event) => showFromFocus(event.currentTarget)}
      onBlur={() => setTooltip(null)}
    >
      <svg viewBox="0 0 22 22" className="size-[22px] -rotate-90" aria-hidden="true">
        <circle cx="11" cy="11" r={radius} fill="none" stroke={LOSE_COLOR} strokeOpacity="0.14" strokeWidth="3" />
        <circle
          cx="11"
          cy="11"
          r={radius}
          fill="none"
          stroke={LOSE_COLOR}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ringProgress)}
        />
      </svg>
    </button>
    {tooltip && globalThis.document ? createPortal(
      <ReadinessTooltip readiness={readiness} label={label} statusColor={statusColor} completion={completion} x={tooltip.x} y={tooltip.y} />,
      globalThis.document.body,
    ) : null}
  </>;
}

function ReadinessTooltip({ readiness, label, statusColor, completion, x, y }: {
  readiness: ExperimentReadiness;
  label: string;
  statusColor: string;
  completion: string | null;
  x: number;
  y: number;
}) {
  const tooltipWidth = 320;
  const tooltipHeight = 128;
  const gap = 12;
  const left = Math.max(8, Math.min(x - tooltipWidth / 2, window.innerWidth - tooltipWidth - 8));
  const top = y + gap + tooltipHeight > window.innerHeight ? Math.max(8, y - tooltipHeight - gap) : y + gap;

  return <div
    role="tooltip"
    className="dashboard-tooltip-shadow pointer-events-none fixed z-[100] w-80 rounded-lg bg-[#f7f7f7] px-3 py-2.5 text-xs text-muted-foreground"
    style={{ left, top }}
  >
    <div className="font-semibold" style={{ color: statusColor }}>{label}</div>
    {readiness.required == null ? <p className="mt-1.5">{readiness.reason}</p> : <>
      <p className="mt-1.5"><span className="font-medium tabular-nums text-foreground">{formatCount(readiness.observed)} / {formatCount(readiness.required)}</span> participants · {Math.round((readiness.progress ?? 0) * 100)}% of total target</p>
      <p className="mt-1">{readiness.remaining != null && readiness.remaining > 0 ? `${formatCount(readiness.remaining)} more needed in underfilled variants · ` : ""}detects a {formatPercent(readiness.minimumDetectableEffect)} relative change at {formatPercent(readiness.confidenceLevel)} confidence / {formatPercent(readiness.power)} power</p>
      {completion ? <p className="mt-1 font-medium text-foreground">Projected: {completion}</p> : null}
    </>}
  </div>;
}

function VariantChance({
  variant,
  bound,
  isLeader,
  isTrailing,
}: {
  variant: VariantExperimentResult;
  bound: number;
  isLeader: boolean;
  isTrailing: boolean;
}) {
  const chance = variant.chanceToWin;
  const tone = chanceTone(variant);

  return (
    <div className="grid gap-2">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-medium">
          <span className="truncate">{variant.label}</span>
          {variant.isControl ? (
            <span className="text-xs font-normal text-muted-foreground">Control</span>
          ) : null}
          {variant.relativeDelta != null ? (
            <span
              className="inline-flex shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums"
              style={{
                color: (variant.relativeDelta ?? 0) >= 0 ? WIN_COLOR : LOSE_COLOR,
                backgroundColor: (variant.relativeDelta ?? 0) >= 0 ? WIN_SOFT : LOSE_SOFT,
              }}
            >
              {formatDelta(variant.relativeDelta)} vs control
            </span>
          ) : null}
        </p>
        <p
          className={cn(
            "shrink-0 text-right tabular-nums",
            isLeader ? "text-sm font-bold" : isTrailing ? "text-xs font-medium text-muted-foreground" : "text-sm font-semibold",
          )}
          style={isLeader ? { color: WIN_COLOR } : isTrailing ? undefined : tone.color ? { color: tone.color } : undefined}
        >
          {chance == null ? "—" : formatPercent(chance)}
          <span
            className={cn("ml-1", isLeader ? "font-bold" : "text-xs font-medium text-muted-foreground")}
          >
            chance to win
          </span>
        </p>
      </div>
      <CredibleIntervalBar variant={variant} bound={bound} isLeader={isLeader} />
    </div>
  );
}

function uniqueChanceKey(variants: VariantExperimentResult[], bound: "max" | "min") {
  const ranked = variants.filter((variant) => variant.chanceToWin != null);
  if (ranked.length === 0) return null;
  const chances = ranked.map((variant) => variant.chanceToWin ?? 0);
  const value = bound === "max" ? Math.max(...chances) : Math.min(...chances);
  const matches = ranked.filter((variant) => variant.chanceToWin === value);
  return matches.length === 1 ? matches[0].key : null;
}

function intervalBound(variants: VariantExperimentResult[]) {
  let bound = 0.25;
  for (const variant of variants) {
    if (variant.relativeDelta != null) bound = Math.max(bound, Math.abs(variant.relativeDelta));
    const interval = variant.credibleInterval;
    if (interval) bound = Math.max(bound, Math.abs(interval[0]), Math.abs(interval[1]));
  }
  return bound;
}

function CredibleIntervalBar({
  variant,
  bound,
  isLeader,
}: {
  variant: VariantExperimentResult;
  bound: number;
  isLeader: boolean;
}) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const interval = variant.credibleInterval;
  const toPercent = (value: number) => ((value + bound) / (2 * bound)) * 100;
  const zero = toPercent(0);
  const start = interval ? Math.min(interval[0], interval[1]) : 0;
  const end = interval ? Math.max(interval[0], interval[1]) : 0;
  const paintStart = Math.min(start, 0);
  const paintEnd = Math.max(end, 0);
  const left = toPercent(paintStart);
  const right = toPercent(paintEnd);
  const updateTooltip = (event: PointerEvent<HTMLDivElement>) => {
    setTooltip({ x: event.clientX, y: event.clientY });
  };

  return (
    <>
      <div
        className="relative h-3 cursor-default rounded-full bg-foreground/[0.06]"
        onPointerEnter={interval ? updateTooltip : undefined}
        onPointerMove={interval ? updateTooltip : undefined}
        onPointerLeave={interval ? () => setTooltip(null) : undefined}
      >
        {paintStart < 0 ? (
          <span
            className="absolute inset-y-0 rounded-l-full"
            style={{
              left: `${left}%`,
              width: `${Math.max(0, zero - left)}%`,
              backgroundColor: LOSE_COLOR,
              opacity: isLeader ? 0.88 : 0.5,
            }}
          />
        ) : null}
        {paintEnd > 0 ? (
          <span
            className="absolute inset-y-0 rounded-r-full"
            style={{
              left: `${zero}%`,
              width: `${Math.max(0, right - zero)}%`,
              backgroundColor: WIN_COLOR,
              opacity: isLeader ? 0.88 : 0.5,
            }}
          />
        ) : null}
        <span
          className="absolute top-[-3px] h-[18px] w-px bg-foreground/40"
          style={{ left: `${zero}%` }}
        />
      </div>
      {tooltip && globalThis.document
        ? createPortal(
            <IntervalTooltip
              label={variant.label}
              start={start}
              end={end}
              x={tooltip.x}
              y={tooltip.y}
            />,
            globalThis.document.body,
          )
        : null}
    </>
  );
}

function IntervalTooltip({
  label,
  start,
  end,
  x,
  y,
}: {
  label: string;
  start: number;
  end: number;
  x: number;
  y: number;
}) {
  const tooltipWidth = 192;
  const tooltipHeight = 132;
  const gap = 14;
  const left = Math.max(8, Math.min(x + gap, window.innerWidth - tooltipWidth - 8));
  const top = y + gap + tooltipHeight > window.innerHeight ? Math.max(8, y - tooltipHeight - gap) : y + gap;
  const metrics = [
    { label: "Low", value: formatDelta(start), color: start < 0 ? LOSE_COLOR : WIN_COLOR },
    { label: "High", value: formatDelta(end), color: end < 0 ? LOSE_COLOR : WIN_COLOR },
  ];

  return (
    <div
      className="dashboard-tooltip-shadow pointer-events-none fixed z-[100] grid min-w-48 gap-2 rounded-lg bg-[#f7f7f7] px-2.5 py-2 text-xs"
      style={{ left, top }}
    >
      <div className="font-medium text-foreground">{label}</div>
      <div className="grid gap-1.5">
        {metrics.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-6 text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-sm" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
            <span className="font-mono font-medium tabular-nums text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
      <p className="max-w-64 text-[11px] leading-snug text-muted-foreground">95% confidence interval for the lift versus control. If it crosses 0%, either variant could still be better.</p>
    </div>
  );
}

function chanceTone(variant: VariantExperimentResult) {
  if (variant.isControl) return { color: undefined };
  if (variant.status === "winning" || (variant.relativeDelta ?? 0) > 0) return { color: WIN_COLOR };
  if (variant.status === "losing" || (variant.relativeDelta ?? 0) < 0) return { color: LOSE_COLOR };
  if ((variant.chanceToWin ?? 0) >= 0.55) return { color: WIN_COLOR };
  if ((variant.chanceToWin ?? 1) <= 0.45) return { color: LOSE_COLOR };
  return { color: undefined };
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatCount(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

function formatDelta(value: number) {
  const percent = value * 100;
  return `${percent > 0 ? "+" : ""}${percent.toLocaleString("en-US", {
    maximumFractionDigits: 1,
  })}%`;
}
