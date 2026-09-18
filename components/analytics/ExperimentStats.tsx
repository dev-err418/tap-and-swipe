"use client";

import { useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import type { ExperimentAnalysis, VariantExperimentResult } from "@/lib/experiment-stats";
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
}: {
  analysis: ExperimentAnalysis;
  title?: string;
  titleClassName?: string;
}) {
  if (analysis.variants.length === 0) return null;
  const leaderKey = uniqueChanceKey(analysis.variants, "max");
  const trailingKey = uniqueChanceKey(analysis.variants, "min");
  return (
    <div className="border-b border-black/[0.08] px-4 py-4">
      {title ? (
        <p className={cn("mb-3 text-xs font-semibold text-black", titleClassName)}>{title}</p>
      ) : null}
      <div className="grid gap-6 sm:grid-cols-2">
        {analysis.variants.map((variant) => (
          <VariantChance
            key={variant.key}
            variant={variant}
            isLeader={variant.key === leaderKey}
            isTrailing={variant.key === trailingKey}
          />
        ))}
      </div>
    </div>
  );
}

function VariantChance({
  variant,
  isLeader,
  isTrailing,
}: {
  variant: VariantExperimentResult;
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
      <CredibleIntervalBar variant={variant} isLeader={isLeader} />
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

function CredibleIntervalBar({
  variant,
  isLeader,
}: {
  variant: VariantExperimentResult;
  isLeader: boolean;
}) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const interval = variant.credibleInterval ?? (variant.isControl ? ([-0.015, 0.015] as [number, number]) : null);
  if (!interval) {
    return <div className="h-3 rounded-full bg-foreground/[0.06]" />;
  }

  const bound = Math.max(0.25, Math.abs(interval[0]), Math.abs(interval[1]), Math.abs(variant.relativeDelta ?? 0));
  const toPercent = (value: number) => ((value + bound) / (2 * bound)) * 100;
  const start = Math.min(interval[0], interval[1]);
  const end = Math.max(interval[0], interval[1]);
  const zero = toPercent(0);
  const left = toPercent(start);
  const right = toPercent(end);
  const redRight = Math.min(zero, right);
  const greenLeft = Math.max(zero, left);
  const updateTooltip = (event: PointerEvent<HTMLDivElement>) => {
    setTooltip({ x: event.clientX, y: event.clientY });
  };

  return (
    <>
      <div
        className="relative h-3 cursor-default rounded-full bg-foreground/[0.06]"
        onPointerEnter={updateTooltip}
        onPointerMove={updateTooltip}
        onPointerLeave={() => setTooltip(null)}
      >
        {start < 0 ? (
          <span
            className="absolute inset-y-0 rounded-l-full"
            style={{
              left: `${left}%`,
              width: `${Math.max(0, redRight - left)}%`,
              backgroundColor: LOSE_COLOR,
              opacity: isLeader ? 0.88 : 0.5,
              borderTopRightRadius: end <= 0 ? 999 : 0,
              borderBottomRightRadius: end <= 0 ? 999 : 0,
            }}
          />
        ) : null}
        {end > 0 ? (
          <span
            className="absolute inset-y-0 rounded-r-full"
            style={{
              left: `${greenLeft}%`,
              width: `${Math.max(0, right - greenLeft)}%`,
              backgroundColor: WIN_COLOR,
              opacity: isLeader ? 0.88 : 0.5,
              borderTopLeftRadius: start >= 0 ? 999 : 0,
              borderBottomLeftRadius: start >= 0 ? 999 : 0,
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
  const tooltipHeight = 92;
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

function formatDelta(value: number) {
  const percent = value * 100;
  return `${percent > 0 ? "+" : ""}${percent.toLocaleString("en-US", {
    maximumFractionDigits: 1,
  })}%`;
}
