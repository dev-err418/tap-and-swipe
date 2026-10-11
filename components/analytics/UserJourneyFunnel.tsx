"use client";

import { Fragment, useState, type PointerEvent } from "react";
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
  type JourneyVersionCohort,
  type UserJourneyVariantResult,
} from "@/lib/user-journey";
import { cn } from "@/lib/utils";

const DROP_COLOR = "#f97316";

export default function UserJourneyFunnel({
  report,
  windowLabel,
  appId,
}: {
  appId?: "glow" | "poky" | "versy";
  report: UserJourneyReport | null;
  windowLabel: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  if (!report) return null;
  if (report.versions?.length) {
    return <div className="min-w-0 overflow-hidden rounded-[28px] bg-white p-4">
      <JourneyVersionComparison showInstallPaid={appId === "poky"} cohorts={report.versions.filter((entry) => entry.version !== "unknown").slice(0, 5)} />
    </div>;
  }
  if ((report.status !== "ready" && report.status !== "empty") || report.variants.length === 0) {
    return (
      <DashboardCard title={report.title} action={<span className="text-xs text-muted-foreground">{windowLabel}</span>}>
        <p role="status" className="text-sm text-muted-foreground">{report.note}</p>
      </DashboardCard>
    );
  }

  const variant = report.variants.find((row) => row.key === selected)
    ?? report.variants.find((row) => row.assigned > 0) ?? report.variants[0];
  const family = variant.family ?? variant.label;
  const families = [...new Set(report.variants.map((row) => row.family ?? row.label))];
  const routes = report.variants.filter((row) => (row.family ?? row.label) === family);

  return (
    <DashboardCard
      title={report.title}
      action={<span className="text-xs text-muted-foreground">Installs {windowLabel.toLowerCase()} · paywall seen</span>}
      contentClassName="pb-4"
    >
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Onboarding variant">
        {families.map((name) => (
          <button
            type="button"
            key={name}
            aria-pressed={name === family}
            onClick={() => setSelected((report.variants.find((row) => (row.family ?? row.label) === name && row.assigned > 0)
              ?? report.variants.find((row) => (row.family ?? row.label) === name))!.key)}
            className={cn(
              DASHBOARD_TAB_CLASS,
              "h-8 px-3",
              name === family ? DASHBOARD_TAB_ACTIVE_CLASS : DASHBOARD_TAB_INACTIVE_CLASS,
            )}
          >
            {name}
            {!variant.family ? <span className="ml-1.5 tabular-nums">({formatPercent(report.variants.find((row) => row.label === name)!.completionShare)})</span> : null}
          </button>
        ))}
      </div>
      {routes.length > 1 ? (
        <div className="mb-4 flex gap-2" role="group" aria-label="Widget route">
          {routes.map((row) => <button key={row.key} type="button" aria-pressed={row.key === variant.key}
            onClick={() => setSelected(row.key)} className={cn(DASHBOARD_TAB_CLASS, "h-7 px-3 text-xs",
              row.key === variant.key ? DASHBOARD_TAB_ACTIVE_CLASS : DASHBOARD_TAB_INACTIVE_CLASS)}>
            {row.label} ({row.assigned > 0 ? formatPercent(row.completionShare) : "—"})
          </button>)}
        </div>
      ) : null}
      <JourneyVariant variant={variant} />
      {report.note ? <p className="mt-3 text-xs text-muted-foreground">{report.note}</p> : null}
    </DashboardCard>
  );
}

export function JourneyVersionComparison({ cohorts, showInstallPaid = false, rowHeading = "First version", rowLabels }: { cohorts: JourneyVersionCohort[]; showInstallPaid?: boolean; rowHeading?: string; rowLabels?: Record<string, string> }) {
  const fields = showInstallPaid ? ["trials", "paid", "installPaid"] as const : ["trials", "paid"] as const;
  if (!cohorts.length) return <p className="text-sm text-muted-foreground">No known first-seen versions in this install window.</p>;
  return <div className="space-y-3">
    <div className="min-w-0 overflow-x-auto rounded-xl border border-black/[0.06] scrollbar-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" role="region" aria-label={rowHeading === "First version" ? "Conversions by first-seen version" : `Conversions by ${rowHeading.toLowerCase()}`} tabIndex={0}>
      <table className={cn("w-full text-left text-xs", showInstallPaid ? "min-w-[1816px]" : "min-w-[1456px]")}>
        <thead className="bg-[#f8f8f8]">
          <tr className="border-b border-black/[0.06]">
            <th scope="col" rowSpan={2} className="sticky left-0 z-10 min-w-32 bg-[#f8f8f8] px-4 py-3 font-medium">{rowHeading}</th>
            {(["All users", "Ads", "Non-ads"] as const).map((label) => <th key={label} scope="colgroup" colSpan={showInstallPaid ? 5 : 4} className="border-l border-black/[0.06] px-3 py-3 font-medium">
              {label}{label === "Non-ads" ? <span className="ml-2 font-normal text-muted-foreground">No recorded ad attribution</span> : null}
            </th>)}
          </tr>
          <tr className="text-muted-foreground">
            {(["global", "ads", "nonAds"] as const).map((audience) => <Fragment key={audience}>
              <th scope="col" className="min-w-24 border-l border-black/[0.06] px-3 py-3 text-right font-medium">Installs</th>
              <th scope="col" className="min-w-28 px-3 py-3 text-right font-medium" title="Net proceeds in USD / all installs in this cohort, including non-payers">APPU</th>
              <th scope="col" className="min-w-28 whitespace-nowrap px-3 py-3 text-right font-medium">Trial start</th>
              <th scope="col" className="min-w-28 whitespace-nowrap px-3 py-3 text-right font-medium" title="Paid users / trials whose recorded end has passed">Trial → paid</th>
              {showInstallPaid ? <th scope="col" className="min-w-28 whitespace-nowrap px-3 py-3 text-right font-medium" title="Paid users from this cohort / installs in this cohort">Install → paid</th> : null}
            </Fragment>)}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((cohort) => <tr key={cohort.version} className="border-t border-black/[0.06]">
            <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-4 font-medium">{rowLabels?.[cohort.version] ?? (cohort.version === "unknown" ? "Unknown" : `v${cohort.version}`)}</th>
            {(["global", "ads", "nonAds"] as const).map((audience) => {
              const metric = cohort.conversions?.[audience];
              const appu = metric && metric.installs > 0 && !metric.missingProceeds && Number.isFinite(metric.proceeds)
                ? metric.proceeds / metric.installs : null;
              const bestAppu = appu != null && appu > 0 && !cohorts.some((other) => {
                const candidate = other.conversions?.[audience];
                return candidate && candidate.installs > 0 && !candidate.missingProceeds
                  && candidate.proceeds / candidate.installs > appu;
              });
              return <Fragment key={audience}>
                <td className="border-l border-black/[0.06] px-3 py-4 text-right tabular-nums">{metric ? metric.installs.toLocaleString("en-US") : "—"}</td>
                <td title={bestAppu ? "Highest average proceeds per user among these versions" : "Average proceeds per user (USD)"}
                  className={cn("whitespace-nowrap px-3 py-4 text-right font-semibold tabular-nums", bestAppu && "bg-orange-100/80 text-orange-900")}>
                  {appu == null ? "—" : appu.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                {fields.map((field) => {
                  const denominator = metric ? (field === "paid" ? metric.finishedTrials : metric.installs) : 0;
                  const available = metric && denominator > 0 && !(field === "paid" && metric.missingMoney) && !(field === "installPaid" && metric.missingInstallMoney);
                  const rate = available ? metric[field] / denominator : 0;
                  const best = rate > 0 && !cohorts.some((other) => {
                    const candidate = other.conversions?.[audience];
                    const candidateDenominator = candidate ? (field === "paid" ? candidate.finishedTrials : candidate.installs) : 0;
                    return candidate && candidateDenominator > 0 && !(field === "paid" && candidate.missingMoney) && !(field === "installPaid" && candidate.missingInstallMoney)
                      && candidate[field] / candidateDenominator > rate;
                  });
                  return <td key={field}
                    title={field === "paid" ? `${metric?.paid ?? 0} paid / ${denominator} finished trials${best ? " · Highest observed rate" : ""}` : best ? "Highest observed conversion rate among these versions" : undefined}
                    className={cn("whitespace-nowrap px-3 py-4 text-right tabular-nums", best && "bg-orange-100/80 text-orange-900")}>
                    {!available ? "—" : <>
                      {best ? <span className="sr-only">Highest observed conversion: </span> : null}
                      <span className="font-semibold">{formatPercent(rate)}</span>
                      <span className={cn("ml-1", best ? "text-orange-800/70" : "text-muted-foreground")}>({metric[field].toLocaleString("en-US")}{` / ${denominator.toLocaleString("en-US")}`})</span>
                    </>}
                  </td>;
                })}
              </Fragment>;
            })}
          </tr>)}
        </tbody>
      </table>
    </div>
  </div>;
}

function JourneyVariant({ variant }: { variant: UserJourneyVariantResult }) {
  const [tooltip, setTooltip] = useState<JourneyTooltip | null>(null);
  if (variant.assigned === 0) {
    return <p role="status" className="text-sm text-muted-foreground">No tracked {variant.family ?? variant.label} installs in this window yet.</p>;
  }
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
