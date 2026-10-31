"use client";

import VersyOfferBreakdown from "./VersyOfferBreakdown";

import { Fragment, useMemo, useRef, useState, type PointerEvent } from "react";
import { Tooltip } from "radix-ui";
import { APPU_CONFIDENCE_LEVEL, APPU_CONFIDENCE_Z, compareArpu } from "@/lib/arpu-comparison";
import { ArpuComparisonCells } from "./ArpuComparisonCells";
import { AppuReadinessIndicator } from "./AppuReadinessIndicator";
import RealizedAppu from "./RealizedAppu";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { experimentCohortLabel } from "@/lib/app-experiment-cohort";

const DROP_COLOR = "#f97316";

export default function UserJourneyFunnel({
  report,
  windowLabel,
  appId,
  funnelOnly = false,
}: {
  appId?: "glow" | "poky" | "versy";
  funnelOnly?: boolean;
  report: UserJourneyReport | null;
  windowLabel: string;
}) {
  const [graphOpen, setGraphOpen] = useState(false);
  const graphTrigger = useRef<HTMLButtonElement | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const cohortLabel = experimentCohortLabel(appId ?? "") ?? `Installs ${windowLabel.toLowerCase()}`;
  if (!report) return null;
  if (!funnelOnly && appId !== "glow" && appId !== "versy" && report.versions?.length) {
    return <DashboardCard title="App versions" contentClassName="pt-0">
      <JourneyVersionComparison showInstallPaid={appId === "poky"} cohorts={report.versions.filter((entry) => entry.version !== "unknown").slice(0, 5)} />
    </DashboardCard>;
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
    <Dialog open={graphOpen} onOpenChange={setGraphOpen}>
      <DashboardCard
        title={report.title}
        titleAccessory={<AppuReadinessIndicator cohorts={report.variants.map((row) => ({ version: row.key, installs: row.assigned, tracked: row.assigned, variants: [row], conversions: row.conversions }))} />}
        action={<span className="text-xs text-muted-foreground">{cohortLabel}</span>}
        contentClassName="pt-0"
      >
        <JourneyVersionComparison
          cohorts={report.variants.map((row) => ({ version: row.key, installs: row.assigned, tracked: row.assigned, variants: [row], conversions: row.conversions }))}
          rowHeading="Onboarding funnel"
          rowLabels={Object.fromEntries(report.variants.map((row) => [row.key, journeyVariantLabel(row)]))}
          allUsersOnly
          showAppuComparison
          showArpuGraph
          showRefundRate
          showInstallPaid
          onRowClick={(key, trigger) => {
            graphTrigger.current = trigger;
            setSelected(key);
            setGraphOpen(true);
          }}
        />
      </DashboardCard>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[min(96vw,1400px)]" onCloseAutoFocus={(event) => {
        event.preventDefault();
        graphTrigger.current?.focus();
      }}>
        <DialogHeader>
          <DialogTitle>{journeyVariantLabel(variant)} · User journey</DialogTitle>
          <DialogDescription>{cohortLabel}. Screen reach and drop-off from Welcome to completion.</DialogDescription>
        </DialogHeader>
        <div className="min-w-0">
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
                {!variant.family ? <span className="ml-1.5 tabular-nums">({report.variants.find((row) => row.label === name)!.assigned > 0 ? formatPercent(report.variants.find((row) => row.label === name)!.completionShare) : "—"})</span> : null}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

function journeyVariantLabel(variant: UserJourneyVariantResult) {
  return variant.family && variant.family !== variant.label ? `${variant.family} · ${variant.label}` : variant.label;
}

export function JourneyVersionComparison({ cohorts, allUsersOnly = false, showRefundRate = false, splitAdSources = false, showInstallPaid = false, rowHeading = "First version", rowLabels, showAppuComparison = false, showArpuGraph = false, onRowClick, clickableRows }: {
  cohorts: JourneyVersionCohort[];
  allUsersOnly?: boolean;
  showRefundRate?: boolean;
  splitAdSources?: boolean;
  showInstallPaid?: boolean;
  rowHeading?: string;
  rowLabels?: Record<string, string>;
  showAppuComparison?: boolean;
  showArpuGraph?: boolean;
  onRowClick?: (key: string, trigger: HTMLButtonElement) => void;
  clickableRows?: readonly string[];
}) {
  const audiences = allUsersOnly ? [{ key: "global", label: "All users" }] as const : splitAdSources
    ? [{ key: "global", label: "All users" }, { key: "metaAds", label: "Meta Ads" }, { key: "asa", label: "ASA" }, { key: "nonAds", label: "Organic" }] as const
    : [{ key: "global", label: "All users" }, { key: "ads", label: "Ads" }, { key: "nonAds", label: "Non-ads" }] as const;
  const comparisons = useMemo(() => Object.fromEntries((showAppuComparison ? ["global", "ads", "metaAds", "asa", "nonAds"] as const : []).map((audience) => {
    const results = compareArpu(cohorts.map((cohort) => ({ key: cohort.version, metric: cohort.conversions?.[audience] })));
    const extent = Math.max(0.1, ...results.flatMap((result) => result.interval && result.lift != null
      ? [Math.abs(result.lift) + 3 * (result.interval[1] - result.interval[0]) / (2 * APPU_CONFIDENCE_Z)] : []));
    return [audience, { results, extent }];
  })), [cohorts, showAppuComparison]);
  const labelFor = (key: string) => rowLabels?.[key] ?? (key === "unknown" ? "Unknown" : `v${key}`);
  const fields = showInstallPaid ? ["trials", "paid", "installPaid"] as const : ["trials", "paid"] as const;
  if (!cohorts.length) return <p className="text-sm text-muted-foreground">No known first-seen versions in this install window.</p>;
  return <Tooltip.Provider delayDuration={150}><div className="space-y-3">
    <div className="min-w-0 overflow-x-auto rounded-xl border border-black/[0.06] scrollbar-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" role="region" aria-label={rowHeading === "First version" ? "Conversions by first-seen version" : `Conversions by ${rowHeading.toLowerCase()}`} tabIndex={0}>
      <table className="w-full text-left text-xs" style={{ minWidth: 136 + audiences.length * ((showInstallPaid ? 560 : 440) + (showAppuComparison ? showArpuGraph ? 540 : 176 : 0) + (showRefundRate ? 112 : 0)) }}>
        <thead className="bg-[#f8f8f8]">
          {!allUsersOnly ? <tr className="border-b border-black/[0.06]">
            <th scope="col" rowSpan={2} className="sticky left-0 z-10 min-w-32 bg-[#f8f8f8] px-4 py-3 font-medium">{rowHeading}</th>
            {audiences.map(({ key, label }) => <th key={key} title={key === "asa" ? "Apple Search Ads" : key === "nonAds" ? "No recorded ad attribution" : undefined} scope="colgroup" colSpan={(showInstallPaid ? 5 : 4) + (showAppuComparison ? 2 : 0) + (showRefundRate ? 1 : 0)} className="border-l border-black/[0.06] px-3 py-3 font-medium">
              {label}{key === "nonAds" ? <span className="ml-2 font-normal text-muted-foreground">No recorded ad attribution</span> : null}
            </th>)}
          </tr> : null}
          <tr className="text-muted-foreground">
            {allUsersOnly ? <th scope="col" className="sticky left-0 z-10 min-w-32 bg-[#f8f8f8] px-4 py-3 text-foreground font-medium">{rowHeading}</th> : null}
            {audiences.map(({ key: audience }) => <Fragment key={audience}>
              <th scope="col" className="min-w-24 border-l border-black/[0.06] px-3 py-3 text-right font-medium">Installs</th>
              {showAppuComparison ? <>
                <th scope="col" className={cn("whitespace-nowrap px-3 py-3 text-right font-medium", showArpuGraph ? "min-w-[460px]" : "min-w-24")} title={`Observed APPU lift and approximate ${Math.round(APPU_CONFIDENCE_LEVEL * 100)}% interval versus the first populated row. Hover for details.`}>APPU lift</th>
                <th scope="col" className="min-w-20 whitespace-nowrap px-3 py-3 text-right font-medium" title="Estimated chance of highest APPU among populated rows in this audience">Win %</th>
              </> : null}
              <th scope="col" className="min-w-28 px-3 py-3 text-right font-medium" title="Average proceeds per user: net proceeds in USD / all installs in this cohort, including non-payers">APPU</th>
              <th scope="col" className="min-w-28 whitespace-nowrap px-3 py-3 text-right font-medium">Trial start</th>
              <th scope="col" className="min-w-28 whitespace-nowrap px-3 py-3 text-right font-medium" title="Paid users / trials whose recorded end has passed">Trial → paid</th>
              {showInstallPaid ? <th scope="col" className="min-w-28 whitespace-nowrap px-3 py-3 text-right font-medium" title="Paid users from this cohort / installs in this cohort">Install → paid</th> : null}
              {showRefundRate ? <>
                <th scope="col" className="min-w-28 whitespace-nowrap px-3 py-3 text-right font-medium" title="Refunded transactions / paid purchases, including renewals. Free trials excluded.">Refund rate</th>
              </> : null}
            </Fragment>)}
          </tr>
        </thead>
        <tbody className="[&>tr>td]:py-2 [&>tr>th]:py-2">
          {cohorts.map((cohort) => <tr key={cohort.version} className="border-t border-black/[0.06]">
            <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-white px-4 py-4 font-medium">
              {onRowClick && (!clickableRows || clickableRows.includes(cohort.version)) ? <button type="button" aria-haspopup="dialog" aria-label={`View screens for ${labelFor(cohort.version)}`}
                className="cursor-pointer rounded-sm text-left underline decoration-black/20 underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                onClick={(event) => onRowClick(cohort.version, event.currentTarget)}>{labelFor(cohort.version)}</button>
                : labelFor(cohort.version)}
            </th>
            {audiences.map(({ key: audience }) => {
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
                {showAppuComparison ? <ArpuComparisonCells result={comparisons[audience].results.find((result) => result.key === cohort.version)!}
                  showGraph={showArpuGraph} metric={metric} label={labelFor(cohort.version)} extent={comparisons[audience].extent}
                  baselineLabel={labelFor(comparisons[audience].results[0]?.baseline ?? cohort.version)} /> : null}
                <td title={bestAppu ? "Highest average proceeds per user among these cohorts" : "Average proceeds per user (USD)"}
                  className={cn("whitespace-nowrap px-3 py-4 text-right font-semibold tabular-nums", bestAppu && "bg-orange-100/80 text-orange-900")}>
                  {appu == null ? "—" : appu.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <RealizedAppu metric={metric?.realizedAppu} />
                  <VersyOfferBreakdown breakdown={metric?.offerBreakdown} realizedAppu={metric?.realizedAppu} users={metric?.installs ?? 0} proceeds={metric?.proceeds ?? 0} available={!!metric && !metric.missingProceeds} />
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
                    title={field === "paid" ? `${metric?.paid ?? 0} paid / ${denominator} finished trials${best ? " · Highest observed rate" : ""}` : best ? "Highest observed conversion rate among these cohorts" : undefined}
                    className={cn("whitespace-nowrap px-3 py-4 text-right tabular-nums", best && "bg-orange-100/80 text-orange-900")}>
                    {!available ? "—" : <>
                      {best ? <span className="sr-only">Highest observed conversion: </span> : null}
                      <span className="font-semibold">{formatPercent(rate)}</span>
                      <span className={cn("ml-1", best ? "text-orange-800/70" : "text-muted-foreground")}>({metric[field].toLocaleString("en-US")}{` / ${denominator.toLocaleString("en-US")}`})</span>
                    </>}
                  </td>;
                })}
                {showRefundRate ? <>
                  <td className="whitespace-nowrap px-3 py-4 text-right tabular-nums" title="Refunded transactions / paid purchases, including renewals">
                    {metric && metric.purchases > 0 && !metric.missingInstallMoney ? <>
                      <span className="font-semibold">{formatPercent(metric.refunds / metric.purchases)}</span>
                      <span className="ml-1 text-muted-foreground">({metric.refunds.toLocaleString("en-US")} / {metric.purchases.toLocaleString("en-US")})</span>
                    </> : "—"}
                  </td>
                </> : null}
              </Fragment>;
            })}
          </tr>)}
        </tbody>
      </table>
    </div>
  </div></Tooltip.Provider>;
}

export function JourneyVariant({ variant }: { variant: UserJourneyVariantResult }) {
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
