"use client";

import { useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { DashboardCard } from "@/components/analytics/DashboardCard";
import {
  DASHBOARD_TAB_ACTIVE_CLASS,
  DASHBOARD_TAB_CLASS,
  DASHBOARD_TAB_INACTIVE_CLASS,
} from "@/components/analytics/dashboard-surface";
import {
  journeyDrops,
  largestDropAttributes,
  type UserJourneyReport,
  type UserJourneyVariantResult,
} from "@/lib/user-journey";
import { cn } from "@/lib/utils";

const DROP_COLOR = "#f97316";

export default function UserJourneyFunnel({
  report,
  windowLabel,
}: {
  report: UserJourneyReport | null;
  windowLabel: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  if (!report) return null;
  if (report.status === "unsupported" || report.status !== "ready") {
    return (
      <DashboardCard title={report.title} action={<span className="text-xs text-muted-foreground">{windowLabel}</span>}>
        <p role="status" className="text-sm text-muted-foreground">{report.note}</p>
      </DashboardCard>
    );
  }

  const variant = report.variants.find((row) => row.key === selected) ?? report.variants[0];

  return (
    <DashboardCard
      title={report.title}
      action={<span className="text-xs text-muted-foreground">Installs {windowLabel.toLowerCase()} · paywall seen</span>}
      contentClassName="pb-4"
    >
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Onboarding variant">
        {report.variants.map((row) => (
          <button
            type="button"
            key={row.key}
            aria-pressed={row.key === variant.key}
            onClick={() => setSelected(row.key)}
            className={cn(
              DASHBOARD_TAB_CLASS,
              "h-8 px-3",
              row.key === variant.key ? DASHBOARD_TAB_ACTIVE_CLASS : DASHBOARD_TAB_INACTIVE_CLASS,
            )}
          >
            {row.label}
            <span className="ml-1.5 tabular-nums">({formatPercent(row.completionShare)})</span>
          </button>
        ))}
      </div>
      <JourneyVariant variant={variant} />
    </DashboardCard>
  );
}

function JourneyVariant({ variant }: { variant: UserJourneyVariantResult }) {
  const [tooltip, setTooltip] = useState<JourneyTooltip | null>(null);
  if (!variant.recorded) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {variant.assigned.toLocaleString("en-US")} {variant.label} installs in this window, and none of them have a screen-reached attribute yet.
      </p>
    );
  }

  const drops = journeyDrops(variant.steps, variant.assigned);
  const steepest = new Set(largestDropAttributes(drops));

  return (
    <>
      <div className="overflow-x-auto scrollbar-none" tabIndex={0} role="region" aria-label={`${variant.label} onboarding screens, left to right`}>
        <ol className="flex h-64 min-w-max items-stretch gap-0.5">
          {variant.steps.map((step, index) => {
            const drop = drops[index];
            const percent = Math.round(step.share * 1000) / 10;
            const height = step.users > 0 ? Math.max(4, Math.min(100, step.share * 100)) : 0;
            const steep = steepest.has(step.attribute);
            const showTooltip = (event: PointerEvent<HTMLLIElement>) => {
              setTooltip({
                label: step.label,
                reached: step.users,
                reachedShare: step.share,
                lost: drop.lost,
                lostShare: drop.lostShare,
                branch: drop.branch,
                x: event.clientX,
                y: event.clientY,
              });
            };
            return (
              <li
                key={step.attribute}
                className="flex w-14 shrink-0 cursor-default flex-col outline-none"
                tabIndex={0}
                aria-label={stepLabel(step.label, step.users, percent, drop)}
                onPointerEnter={showTooltip}
                onPointerMove={showTooltip}
                onPointerLeave={() => setTooltip(null)}
                onFocus={(event) => {
                  const bounds = event.currentTarget.getBoundingClientRect();
                  setTooltip({
                    label: step.label,
                    reached: step.users,
                    reachedShare: step.share,
                    lost: drop.lost,
                    lostShare: drop.lostShare,
                    branch: drop.branch,
                    x: bounds.left + bounds.width / 2,
                    y: bounds.top,
                  });
                }}
                onBlur={() => setTooltip(null)}
              >
                <span className="pb-1 text-center text-[11px] font-medium tabular-nums text-black/70">{percent}%</span>
                <span className="relative min-h-0 flex-1 border-b border-black/10">
                  <span
                    className={cn("absolute inset-x-0.5 bottom-0 rounded-t-md", !steep && !step.branch && "bg-[#1d4ed8]", step.branch && "bg-black/20")}
                    style={{ height: `${height}%`, backgroundColor: steep ? DROP_COLOR : undefined }}
                  />
                </span>
                <span className="block w-full min-w-0 truncate pt-1.5 text-center text-[11px] text-black/80">{step.label}</span>
                <span className="text-center text-[11px] tabular-nums text-muted-foreground">{step.users.toLocaleString("en-US")}</span>
              </li>
            );
          })}
        </ol>
      </div>
      {tooltip && globalThis.document ? createPortal(<JourneyTooltipCard tooltip={tooltip} />, globalThis.document.body) : null}
    </>
  );
}

type JourneyTooltip = {
  label: string;
  reached: number;
  reachedShare: number;
  lost: number;
  lostShare: number;
  branch: boolean;
  x: number;
  y: number;
};

function JourneyTooltipCard({ tooltip }: { tooltip: JourneyTooltip }) {
  const width = 220;
  const height = tooltip.branch ? 92 : 112;
  const gap = 14;
  const left = Math.max(8, Math.min(tooltip.x + gap, window.innerWidth - width - 8));
  const top = tooltip.y + gap + height > window.innerHeight
    ? Math.max(8, tooltip.y - height - gap)
    : tooltip.y + gap;
  return (
    <div
      role="tooltip"
      className="dashboard-tooltip-shadow pointer-events-none fixed z-[100] grid min-w-52 gap-2 rounded-lg bg-[#f7f7f7] px-2.5 py-2 text-xs"
      style={{ left, top }}
    >
      <div className="font-medium text-foreground">{tooltip.label}</div>
      <div className="grid gap-1.5">
        <TooltipRow label="Reached" value={`${tooltip.reached.toLocaleString("en-US")} (${formatPercent(tooltip.reachedShare)})`} />
        {tooltip.branch ? (
          <TooltipRow label="Path" value="Side path" />
        ) : (
          <TooltipRow label="Lost" value={`#${tooltip.lost.toLocaleString("en-US")} (${formatPercent(tooltip.lostShare)})`} />
        )}
      </div>
    </div>
  );
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 text-muted-foreground">
      <span>{label}</span>
      <span className="font-mono font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function stepLabel(label: string, users: number, percent: number, drop: { lost: number; lostShare: number; branch: boolean }) {
  const reached = `${label}: ${users.toLocaleString("en-US")} users, ${percent}% of assigned`;
  if (drop.branch) return `${reached}, side path`;
  return `${reached}, lost #${drop.lost.toLocaleString("en-US")} (${formatPercent(drop.lostShare)})`;
}

function formatPercent(share: number) {
  const value = Math.round(share * 1000) / 10;
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}
