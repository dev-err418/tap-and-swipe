"use client";

import { useId } from "react";
import { Tooltip } from "radix-ui";
import { APPU_CONFIDENCE_LEVEL, APPU_CONFIDENCE_Z, type ArpuComparison } from "@/lib/arpu-comparison";
import type { VersionConversionMetric } from "@/lib/version-cohort-conversions";

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;
const delta = (value: number) => `${value > 0 ? "+" : ""}${percent(value)}`;

export function ArpuComparisonCells({ result, metric, label, baselineLabel, extent, showGraph }: {
  result: ArpuComparison; metric?: VersionConversionMetric; label: string; baselineLabel: string; extent: number; showGraph: boolean;
}) {
  return <>
    <td className={`${showGraph ? "min-w-[460px]" : "min-w-24"} px-3 text-right tabular-nums`}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button type="button" className="flex w-full cursor-help items-center justify-end gap-3 rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={`${label}: ${result.isBaseline ? "APPU baseline" : `APPU lift ${result.lift == null ? "unavailable" : delta(result.lift)}`}. Win ${result.winProbability == null ? "unavailable" : percent(result.winProbability)}.`}>
            <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
              {result.isBaseline ? "Baseline" : result.lift == null ? "—" : delta(result.lift)}
            </span>
            {showGraph ? <LiftDistribution result={result} extent={extent} /> : null}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content side="top" sideOffset={8} collisionPadding={12}
            className="z-[100] w-80 rounded-xl border border-foreground/10 bg-card p-4 text-xs text-foreground shadow-xl">
            <div className="mb-3 font-semibold">{label}</div>
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 tabular-nums">
              <dt className="text-muted-foreground">Net proceeds</dt><dd className="text-right">{metric && !metric.missingProceeds ? metric.proceeds.toLocaleString("en-US", { style: "currency", currency: "USD" }) : "—"}</dd>
              <dt className="text-muted-foreground">Installs</dt><dd className="text-right">{metric?.installs.toLocaleString("en-US") ?? "—"}</dd>
              <dt className="text-muted-foreground">Chance to win</dt><dd className="text-right">{result.winProbability == null ? "—" : percent(result.winProbability)}</dd>
              <dt className="text-muted-foreground">APPU lift</dt><dd className="text-right">{result.isBaseline ? "Baseline" : result.lift == null ? "—" : delta(result.lift)}</dd>
              <dt className="text-muted-foreground">{Math.round(APPU_CONFIDENCE_LEVEL * 100)}% interval</dt><dd className="text-right">{result.interval ? `[${delta(result.interval[0])}, ${delta(result.interval[1])}]` : "—"}</dd>
            </dl>
            <p className="mt-3 text-muted-foreground">Compared with {baselineLabel}. Win % estimates the chance of highest APPU among populated rows in this audience.</p>
            <p className="mt-2 text-muted-foreground">Normal approximation using net proceeds per install, including non-payers and refunds. Cohort ages and audiences can differ; this is not proof of a causal lift.</p>
            {result.reason ? <p className="mt-2 text-analytics-highlight">{result.reason}</p> : null}
            <Tooltip.Arrow className="fill-white" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </td>
    <td className="min-w-20 whitespace-nowrap px-3 text-right font-semibold tabular-nums">
      {result.winProbability == null ? <span className="text-muted-foreground">—</span> : percent(result.winProbability)}
    </td>
  </>;
}

function LiftDistribution({ result, extent }: { result: ArpuComparison; extent: number }) {
  const id = useId().replace(/:/g, "");
  const width = 360;
  const x = (value: number) => width / 2 + value / extent * (width / 2 - 4);
  const lift = result.lift;
  const se = result.interval ? (result.interval[1] - result.interval[0]) / (2 * APPU_CONFIDENCE_Z) : 0;
  const points = result.interval && lift != null && se > 0 ? Array.from({ length: 61 }, (_, index) => {
    const value = lift + (index / 60 * 6 - 3) * se;
    return { x: x(value), h: 10 * Math.exp(-0.5 * ((value - lift) / se) ** 2) };
  }) : [];
  const path = points.length ? `M${points.map((point) => `${point.x},${16 - point.h}`).join(" L")} L${[...points].reverse().map((point) => `${point.x},${16 + point.h}`).join(" L")} Z` : "";
  return <svg width={width} height="24" preserveAspectRatio="none" viewBox={`0 0 ${width} 32`} className="shrink-0 overflow-hidden" aria-hidden="true">
    <defs><clipPath id={`${id}-negative`}><rect width={width / 2} height="32" /></clipPath><clipPath id={`${id}-positive`}><rect x={width / 2} width={width / 2} height="32" /></clipPath></defs>
    <line x1="0" x2={width} y1="16" y2="16" stroke="currentColor" opacity="0.06" />
    <line x1={width / 2} x2={width / 2} y1="2" y2="30" stroke="currentColor" opacity="0.2" />
    {path ? <>
      <path d={path} clipPath={`url(#${id}-negative)`} fill="#e35d6a" opacity="0.7" />
      <path d={path} clipPath={`url(#${id}-positive)`} fill="#22a578" opacity="0.7" />
      <line x1={x(lift!)} x2={x(lift!)} y1="6" y2="26" stroke="currentColor" opacity="0.7" />
    </> : <text x={width / 2 + 10} y="20" fontSize="10" fill="currentColor" opacity="0.4">{result.isBaseline ? "0%" : "—"}</text>}
  </svg>;
}
