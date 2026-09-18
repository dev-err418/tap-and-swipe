"use client";

import { useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ArrowDownRight, Maximize2 } from "lucide-react";
import type { AppSprintFunnelAnalytics, AppSprintFunnelBreakdownRow } from "@/lib/appsprint-funnel";
import { VisitorsRevenueChart } from "@/components/analytics/AppSprintFunnelCharts";
import { DashboardCard } from "@/components/analytics/DashboardCard";
import ExperimentStats, { ExperimentWarningBadge } from "@/components/analytics/ExperimentStats";
import { analyzeExperiment, type ExperimentArm } from "@/lib/experiment-stats";
import {
  DASHBOARD_TAB_ACTIVE_CLASS,
  DASHBOARD_TAB_CLASS,
  DASHBOARD_TAB_INACTIVE_CLASS,
  DASHBOARD_TAB_LIST_CLASS,
} from "@/components/analytics/dashboard-surface";
import { DashboardCardMetricPicker } from "@/components/analytics/DashboardCardMetricPicker";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PREVIEW_ROWS = 10;
const POSTBACK_TINT_ORANGE = "#f97316";
const VISITOR_BLUE = "#1d4ed8";
const VISITOR_BAR_SHARE = 62;
const REVENUE_BAR_SHARE = 100 - VISITOR_BAR_SHARE;

export default function AppSprintFunnelPanel({
  analytics,
  showHeroExperiment = true,
  showPricingExperiment = false,
  showTrialExperiment = false,
  showOnboardingExperiment = false,
}: {
  analytics: AppSprintFunnelAnalytics;
  showHeroExperiment?: boolean;
  showPricingExperiment?: boolean;
  showTrialExperiment?: boolean;
  showOnboardingExperiment?: boolean;
}) {
  const daily = analytics.daily.filter((row) => row.surface === "aso");
  const interval = analytics.interval?.filter((row) => row.surface === "aso") ?? [];
  const sources = analytics.byChannel.filter((row) => row.surface === "aso");
  const countries = analytics.byCountry.filter((row) => row.surface === "aso");
  const referrers = analytics.byReferrer.filter((row) => row.surface === "aso");
  const visits = analytics.totals.asoVisits;
  const revenue = daily.reduce((sum, row) => sum + row.revenue, 0);
  const windowLabel = `Last ${analytics.windowDays} ${analytics.windowDays === 1 ? "day" : "days"}`;

  const trend = interval.length > 0
    ? interval.map((row) => ({
        date: row.bucket,
        visits: row.visits,
        revenue: row.revenue,
        trialStarts: row.asoTrials,
      }))
    : daily.map((row) => ({
        date: row.date,
        visits: row.visits,
        revenue: row.revenue,
        trialStarts: row.asoTrials,
      }));
  const pricingAnalysis = analyzeExperiment(toRevenueArms(analytics.pricingExperiment ?? []), "revenue_per_visitor", "Revenue / visitor");
  const heroAnalysis = analyzeExperiment(toRevenueArms(analytics.heroPreviewExperiment), "revenue_per_visitor", "Revenue / visitor");
  const trialAnalysis = analyzeExperiment(toRevenueArms(analytics.trialExperiment ?? []), "revenue_per_visitor", "Revenue / visitor");
  const onboardingAnalysis = analyzeExperiment((analytics.onboardingExperiment ?? []).map((row) => ({ key: row.variant, label: row.label, exposures: row.visitors, conversions: row.completed, revenue: row.revenue })), "conversion_rate", "Completion rate");
  return (
    <section className="space-y-4">
      <div className="min-w-0 overflow-visible rounded-[28px] border-0 bg-white shadow-none">
        <div className="min-w-0 overflow-x-auto border-b border-black/[0.08]">
          <div className="grid min-w-[48rem] grid-cols-4 divide-x divide-black/[0.08]">
            <MetricSummary label="Visitors" value={formatInt(visits)} detail={windowLabel} />
            <MetricSummary label="Revenue" value={formatCurrency(revenue)} detail={`${formatInt(analytics.totals.asoPaid)} paid (${formatPercent(ratio(analytics.totals.asoPaid, visits))})`} />
            <MetricSummary label="Paid rate" value={formatPercent(ratio(analytics.totals.asoPaid, visits))} detail={`${formatInt(analytics.totals.asoPaid)} paid / ${formatInt(visits)} visitors`} />
            <MetricSummary label="Revenue / visitor" value={formatPreciseCurrency(ratio(revenue, visits))} detail="Paid revenue / visitors" />
          </div>
        </div>
        <div className="min-w-0 p-4">
          <VisitorsRevenueChart data={trend} />
        </div>
      </div>

      {showPricingExperiment ? <DashboardCard title="Pricing A/B test" titleAccessory={<ExperimentWarningBadge analysis={pricingAnalysis} />} titleClassName="flex items-center gap-1.5" action={<span className="text-xs text-muted-foreground">50/50 · {windowLabel}</span>} contentClassName="min-w-0 p-0">
        <ExperimentStats analysis={pricingAnalysis} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[70rem] text-sm">
            <thead><tr className="border-b border-black/10 text-left text-xs text-black/50"><Th>Offer</Th><Th right>Visitors</Th><Th right>Checkouts</Th><Th right>Checkout rate</Th><Th right>Trials</Th><Th right>Paid</Th><Th right>Paid rate</Th><Th right>Initial revenue</Th><Th right className="font-bold text-black">Revenue / visitor</Th></tr></thead>
            <tbody>
              {(analytics.pricingExperiment ?? []).map((row) => (
                <tr key={row.variant} className="border-b border-black/[0.07]">
                  <Td><div className="flex items-center gap-2"><Badge>Variant {row.variant === "legacy_usd" ? "A" : "B"}</Badge><span className="font-medium">{row.label}</span></div></Td>
                  <NumberTd>{formatInt(row.visitors)}</NumberTd><NumberTd>{formatInt(row.paymentPageViews)}</NumberTd><NumberTd>{formatPercent(ratio(row.paymentPageViews, row.visitors))}</NumberTd><NumberTd>{formatInt(row.trials)}</NumberTd><NumberTd>{formatInt(row.paid)}</NumberTd><NumberTd>{formatPercent(ratio(row.paid, row.visitors))}</NumberTd><NumberTd>{formatPreciseCurrency(row.revenue)}</NumberTd><NumberTd className="font-bold">{formatPreciseCurrency(ratio(row.revenue, row.visitors))}</NumberTd>
                </tr>
              ))}
              {!analytics.pricingExperiment?.length ? <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Pricing experiment data is not available yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </DashboardCard> : null}

      {showHeroExperiment ? <DashboardCard title="Hero preview A/B test" titleAccessory={<ExperimentWarningBadge analysis={heroAnalysis} />} titleClassName="flex items-center gap-1.5" action={<span className="text-xs text-muted-foreground">{windowLabel}</span>} contentClassName="min-w-0 p-0">
        <ExperimentStats analysis={heroAnalysis} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead><tr className="border-b border-black/10 text-left text-xs text-black/50"><Th>Variant</Th><Th right>Visitors</Th><Th right>Payment page</Th><Th right>Page rate</Th><Th right>Paid</Th><Th right>Paid rate</Th><Th right>Revenue</Th></tr></thead>
            <tbody>
              {analytics.heroPreviewExperiment.map((row, index) => (
                <tr key={row.variant} className="border-b border-black/[0.07]">
                  <Td><div className="flex items-center gap-2"><Badge>Variant {variantLetter(index)}</Badge><span className="font-medium">{row.label}</span></div></Td>
                  <NumberTd>{formatInt(row.visitors)}</NumberTd><NumberTd>{formatInt(row.paymentPageViews)}</NumberTd><NumberTd>{formatPercent(ratio(row.paymentPageViews, row.visitors))}</NumberTd><NumberTd>{formatInt(row.paid)}</NumberTd><NumberTd>{formatPercent(ratio(row.paid, row.visitors))}</NumberTd><NumberTd>{formatCurrency(row.revenue)}</NumberTd>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard> : null}

      {showTrialExperiment ? <DashboardCard title="Trial length A/B/C test" titleAccessory={<ExperimentWarningBadge analysis={trialAnalysis} />} titleClassName="flex items-center gap-1.5" action={<span className="text-xs text-muted-foreground">{windowLabel}</span>} contentClassName="min-w-0 p-0">
        <ExperimentStats analysis={trialAnalysis} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] text-sm">
            <thead><tr className="border-b border-black/10 text-left text-xs text-black/50"><Th>Variant</Th><Th right>Visitors</Th><Th right>Payment page</Th><Th right>Page rate</Th><Th right>Trial</Th><Th right>Trial rate</Th><Th right>Paid</Th><Th right>Paid rate</Th><Th right>Revenue</Th></tr></thead>
            <tbody>
              {(analytics.trialExperiment ?? []).map((row, index) => (
                <tr key={row.variant} className="border-b border-black/[0.07]">
                  <Td><div className="flex items-center gap-2"><Badge>Variant {variantLetter(index)}</Badge><span className="font-medium">{row.label}</span></div></Td>
                  <NumberTd>{formatInt(row.visitors)}</NumberTd><NumberTd>{formatInt(row.paymentPageViews)}</NumberTd><NumberTd>{formatPercent(ratio(row.paymentPageViews, row.visitors))}</NumberTd><NumberTd>{formatInt(row.trials)}</NumberTd><NumberTd>{formatPercent(ratio(row.trials, row.visitors))}</NumberTd><NumberTd>{formatInt(row.paid)}</NumberTd><NumberTd>{formatPercent(ratio(row.paid, row.visitors))}</NumberTd><NumberTd>{formatCurrency(row.revenue)}</NumberTd>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard> : null}

      {showOnboardingExperiment ? <DashboardCard title="Onboarding A/B test" titleAccessory={<ExperimentWarningBadge analysis={onboardingAnalysis} />} titleClassName="flex items-center gap-1.5" action={<span className="text-xs text-muted-foreground">{windowLabel}</span>} contentClassName="min-w-0 p-0">
        <ExperimentStats analysis={onboardingAnalysis} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] text-sm">
            <thead><tr className="border-b border-black/10 text-left text-xs text-black/50"><Th>Variant</Th><Th right>Started</Th><Th right>Completed</Th><Th right>Completion rate</Th><Th right>Payment page</Th><Th right>Trial</Th><Th right>Paid</Th><Th right>Revenue</Th></tr></thead>
            <tbody>
              {(analytics.onboardingExperiment ?? []).map((row, index) => (
                <tr key={row.variant} className="border-b border-black/[0.07]">
                  <Td><div className="flex items-center gap-2"><Badge>Variant {variantLetter(index)}</Badge><span className="font-medium">{row.label}</span></div></Td>
                  <NumberTd>{formatInt(row.visitors)}</NumberTd><NumberTd>{formatInt(row.completed)}</NumberTd><NumberTd>{formatPercent(ratio(row.completed, row.visitors))}</NumberTd><NumberTd>{formatInt(row.paymentPageViews)}</NumberTd><NumberTd>{formatInt(row.trials)}</NumberTd><NumberTd>{formatInt(row.paid)}</NumberTd><NumberTd>{formatCurrency(row.revenue)}</NumberTd>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard> : null}

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <BreakdownCard
          title="Sources"
          ariaLabel="Sources metric"
          tabs={[
            {
              id: "source",
              label: "Source",
              rows: sources,
              emptyLabel: "Source",
              getLabel: (row) => row.channelLabel ?? row.channel ?? "Unknown",
            },
            {
              id: "referrer",
              label: "Referrer",
              rows: referrers,
              emptyLabel: "Referrer",
              getLabel: (row) => row.referrerLabel ?? row.referrerHost ?? "Direct",
            },
          ]}
          contentClassName="h-[24.5rem] space-y-0 p-0 pr-0.5"
        />
        <BreakdownCard
          title="Countries"
          ariaLabel="Countries metric"
          tabs={[
            {
              id: "country",
              label: "Country",
              rows: countries,
              emptyLabel: "Country",
              getLabel: (row) => countryName(row.country),
              getPrefix: (row) => row.country ? countryFlag(row.country) : "??",
            },
          ]}
          contentClassName="h-[24.5rem] space-y-0 p-0 pr-0.5"
        />
      </div>
    </section>
  );
}

function MetricSummary({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 px-4 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

type BreakdownMetric = "visitors" | "revenue";

type BreakdownTab = {
  id: string;
  label: string;
  emptyLabel: string;
  rows: AppSprintFunnelBreakdownRow[];
  getLabel: (row: AppSprintFunnelBreakdownRow) => string;
  getPrefix?: (row: AppSprintFunnelBreakdownRow) => string;
};

function BreakdownCard({
  title,
  ariaLabel,
  tabs,
  contentClassName,
}: {
  title: string;
  ariaLabel: string;
  tabs: BreakdownTab[];
  contentClassName?: string;
}) {
  const [metric, setMetric] = useState<BreakdownMetric>("visitors");
  const [tab, setTab] = useState(tabs[0]?.id ?? "");
  const activeTab = tabs.find((item) => item.id === tab) ?? tabs[0];
  const showTabs = tabs.length > 1;
  const sortedRows = activeTab ? sortRows(activeTab.rows, metric) : [];
  const previewRows = sortedRows.slice(0, PREVIEW_ROWS);

  return (
    <DashboardCard
      title={title}
      titleAccessory={
        <DashboardCardMetricPicker
          ariaLabel={ariaLabel}
          value={metric}
          options={["visitors", "revenue"] as const}
          labels={{ visitors: "Visitors", revenue: "Revenue" }}
          onValueChange={setMetric}
        />
      }
      action={
        showTabs ? (
          <div className={DASHBOARD_TAB_LIST_CLASS} role="tablist" aria-label={title}>
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  DASHBOARD_TAB_CLASS,
                  "px-3",
                  tab === item.id ? DASHBOARD_TAB_ACTIVE_CLASS : DASHBOARD_TAB_INACTIVE_CLASS,
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : undefined
      }
      headerClassName="h-[46px] border-b-0 py-0 pr-2"
      contentClassName={contentClassName}
      footer={
        activeTab && sortedRows.length > PREVIEW_ROWS ? (
          <BreakdownDetails
            title={`${activeTab.label} details`}
            description={`${sortedRows.length.toLocaleString("en-US")} ${activeTab.emptyLabel.toLocaleLowerCase("en-US")} ${sortedRows.length === 1 ? "row" : "rows"} for the selected period, sorted by ${metric}.`}
            rows={sortedRows}
            metric={metric}
            label={activeTab.emptyLabel}
            getLabel={activeTab.getLabel}
            getPrefix={activeTab.getPrefix}
          />
        ) : undefined
      }
    >
      {activeTab ? (
        <BreakdownTable
          key={activeTab.id}
          rows={previewRows}
          metric={metric}
          label={activeTab.emptyLabel}
          getLabel={activeTab.getLabel}
          getPrefix={activeTab.getPrefix}
        />
      ) : null}
    </DashboardCard>
  );
}

type BreakdownTooltipState = {
  row: AppSprintFunnelBreakdownRow;
  label: string;
  marker: ReactNode;
  x: number;
  y: number;
};

function BreakdownDetails({
  title,
  description,
  rows,
  metric,
  label,
  getLabel,
  getPrefix,
}: {
  title: string;
  description: string;
  rows: AppSprintFunnelBreakdownRow[];
  metric: BreakdownMetric;
  label: string;
  getLabel: (row: AppSprintFunnelBreakdownRow) => string;
  getPrefix?: (row: AppSprintFunnelBreakdownRow) => string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        className="pointer-events-auto inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-muted px-3 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-input hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/40"
        onClick={() => setOpen(true)}
      >
        See details
        <Maximize2 className="size-3" aria-hidden />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-hidden bg-white p-0 sm:max-w-3xl">
          <DialogHeader className="px-6 pt-6 pr-16">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 max-h-[65dvh] overflow-auto overscroll-contain border-t border-black/[0.06] p-0 pr-0.5">
            <BreakdownTable
              rows={rows}
              metric={metric}
              label={label}
              getLabel={getLabel}
              getPrefix={getPrefix}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BreakdownTable({
  rows,
  metric,
  label,
  getLabel,
  getPrefix,
}: {
  rows: AppSprintFunnelBreakdownRow[];
  metric: BreakdownMetric;
  label: string;
  getLabel: (row: AppSprintFunnelBreakdownRow) => string;
  getPrefix?: (row: AppSprintFunnelBreakdownRow) => string;
}) {
  const [tooltip, setTooltip] = useState<BreakdownTooltipState | null>(null);
  const maxVisits = Math.max(0, ...rows.map((row) => row.visits));
  const maxRevenue = Math.max(0, ...rows.map((row) => row.revenue));
  if (rows.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No {label.toLowerCase()} data yet.</div>;
  }
  return (
    <>
      <div className="min-w-0">
        {rows.map((row, index) => (
          <BreakdownRow
            key={`${getLabel(row)}-${index}`}
            row={row}
            label={getLabel(row)}
            prefix={getPrefix?.(row)}
            metric={metric}
            maxVisits={maxVisits}
            maxRevenue={maxRevenue}
            onTooltipChange={setTooltip}
          />
        ))}
      </div>
      {tooltip && globalThis.document
        ? createPortal(<BreakdownTooltip tooltip={tooltip} />, globalThis.document.body)
        : null}
    </>
  );
}

function BreakdownRow({
  row,
  label,
  prefix,
  metric,
  maxVisits,
  maxRevenue,
  onTooltipChange,
}: {
  row: AppSprintFunnelBreakdownRow;
  label: string;
  prefix?: string;
  metric: BreakdownMetric;
  maxVisits: number;
  maxRevenue: number;
  onTooltipChange: (tooltip: BreakdownTooltipState | null) => void;
}) {
  const hasRevenueScale = maxRevenue > 0;
  const visitWidth = barPercent(row.visits, maxVisits, hasRevenueScale ? VISITOR_BAR_SHARE : 100);
  const revenueWidth = barPercent(row.revenue, maxRevenue, REVENUE_BAR_SHARE);
  const barWidth = Math.min(100, visitWidth + revenueWidth);
  const rowPrefix = prefix ?? <ArrowDownRight className="size-4" />;
  const metricValue = metric === "revenue" ? formatCurrency(row.revenue) : formatInt(row.visits);
  const updateTooltip = (event: PointerEvent<HTMLDivElement>) => {
    onTooltipChange({ row, label, marker: rowPrefix, x: event.clientX, y: event.clientY });
  };

  return (
    <div
      className="relative h-9 outline-none"
      tabIndex={0}
      onPointerEnter={updateTooltip}
      onPointerMove={updateTooltip}
      onPointerLeave={() => onTooltipChange(null)}
      onFocus={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        onTooltipChange({
          row,
          label,
          marker: rowPrefix,
          x: bounds.left + bounds.width / 2,
          y: bounds.top + bounds.height / 2,
        });
      }}
      onBlur={() => onTooltipChange(null)}
    >
      <div className="relative h-8 min-w-0 overflow-hidden rounded-r-md">
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 ${revenueWidth > 0 ? "" : "rounded-r-md"}`}
          style={{ width: `${visitWidth}%`, backgroundColor: VISITOR_BLUE, opacity: 0.88 }}
        />
        {revenueWidth > 0 ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 rounded-r-md"
            style={{ left: `${visitWidth}%`, width: `${revenueWidth}%`, backgroundColor: POSTBACK_TINT_ORANGE, opacity: 0.88 }}
          />
        ) : null}
        <div className="relative z-10 flex h-full min-w-0 items-center gap-2 px-3 text-sm font-medium text-foreground">
          <span className="flex size-5 shrink-0 items-center justify-center text-base">{rowPrefix}</span>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <span className="shrink-0 font-mono text-xs font-medium tabular-nums">{metricValue}</span>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20"
          style={{ clipPath: `inset(0 ${100 - barWidth}% 0 0)` }}
        >
          <div className="flex h-full min-w-0 items-center gap-2 px-3 text-sm font-medium text-white">
            <span className="flex size-5 shrink-0 items-center justify-center text-base">{rowPrefix}</span>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <span className="shrink-0 font-mono text-xs font-medium tabular-nums">{metricValue}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BreakdownTooltip({ tooltip }: { tooltip: BreakdownTooltipState }) {
  const tooltipWidth = 192;
  const tooltipHeight = 116;
  const gap = 14;
  const left = Math.max(8, Math.min(tooltip.x + gap, window.innerWidth - tooltipWidth - 8));
  const top =
    tooltip.y + gap + tooltipHeight > window.innerHeight
      ? Math.max(8, tooltip.y - tooltipHeight - gap)
      : tooltip.y + gap;
  const metrics = [
    { label: "Visitors", value: formatInt(tooltip.row.visits), color: VISITOR_BLUE },
    { label: "Checkout", value: `${formatInt(tooltip.row.asoCheckouts)} (${formatPercent(ratio(tooltip.row.asoCheckouts, tooltip.row.visits))})`, color: "oklch(0.55 0.02 250)" },
    { label: "Paid", value: `${formatCurrency(tooltip.row.revenue)} (${formatPercent(ratio(tooltip.row.asoPaid, tooltip.row.visits))})`, color: POSTBACK_TINT_ORANGE },
  ];

  return (
    <div
      className="dashboard-tooltip-shadow pointer-events-none fixed z-[100] grid min-w-48 gap-2 rounded-lg bg-[#f7f7f7] px-2.5 py-2 text-xs"
      style={{ left, top }}
    >
      <div className="flex items-center gap-2 font-medium text-foreground">
        <span className="flex size-4 items-center justify-center">{tooltip.marker}</span>
        <span>{tooltip.label}</span>
      </div>
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

function toRevenueArms(rows: { variant: string; label: string; visitors: number; paid: number; revenue: number }[]): ExperimentArm[] {
  return rows.map((row) => ({
    key: row.variant,
    label: row.label,
    exposures: row.visitors,
    conversions: row.paid,
    revenue: row.revenue,
  }));
}

function Th({ children, right = false, className }: { children: React.ReactNode; right?: boolean; className?: string }) { return <th className={cn("px-4 py-3 font-medium", right && "text-right", className)}>{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-4 py-3">{children}</td>; }
function NumberTd({ children, className }: { children: React.ReactNode; className?: string }) { return <td className={cn("px-4 py-3 text-right font-mono tabular-nums", className)}>{children}</td>; }
function Badge({ children }: { children: React.ReactNode }) { return <span className="inline-flex rounded-md bg-black/[0.055] px-2 py-0.5 text-xs font-medium">{children}</span>; }

function sortRows<T extends AppSprintFunnelBreakdownRow>(rows: T[], metric: BreakdownMetric) {
  return [...rows].sort((a, b) => {
    const primary = metric === "revenue" ? b.revenue - a.revenue : b.visits - a.visits;
    const secondary = metric === "revenue" ? b.visits - a.visits : b.revenue - a.revenue;
    return primary || secondary || totalConversions(b) - totalConversions(a);
  });
}
function totalConversions(row: AppSprintFunnelBreakdownRow) { return row.bookCallClicks + row.bookCallStarted + row.asoCheckouts + row.asoTrials + row.asoPaid; }
function barPercent(value: number, maxValue: number, maxWidth: number) { if (value <= 0 || maxValue <= 0 || maxWidth <= 0) return 0; return Math.min(maxWidth, Math.max(Math.min(2, maxWidth), (value / maxValue) * maxWidth)); }
function ratio(part: number, total: number) { return total > 0 ? part / total : 0; }
function formatInt(value: number) { return finite(value).toLocaleString("en", { maximumFractionDigits: 0 }); }
function formatPercent(value: number) { return `${(finite(value) * 100).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`; }
function variantLetter(index: number) { return String.fromCharCode(65 + Math.max(0, index)); }
function formatCurrency(value: number) { return new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(finite(value)); }
function formatPreciseCurrency(value: number) { return new Intl.NumberFormat("en", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(finite(value)); }
function finite(value: number) { return Number.isFinite(value) ? value : 0; }
function countryFlag(code: string) { return code.toUpperCase().replace(/./g, (character) => String.fromCodePoint(127397 + character.charCodeAt(0))); }
function countryName(code: string | null | undefined) { if (!code) return "Unknown"; try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code; } catch { return code; } }

