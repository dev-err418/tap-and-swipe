"use client";

import { useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Maximize2 } from "lucide-react";
import type { MobileAppPlanCountryRow } from "@/lib/mobile-app-analytics";
import { DashboardCard } from "@/components/analytics/DashboardCard";
import { DashboardCardMetricPicker } from "@/components/analytics/DashboardCardMetricPicker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const YEARLY_COLOR = "#1d4ed8";
const WEEKLY_COLOR = "#f97316";
const PREVIEW_ROWS = 10;

type PlanMetric =
  | "installs"
  | "yearly_share"
  | "weekly_share"
  | "yearly_appu"
  | "weekly_appu"
  | "yearly_subs"
  | "weekly_subs";

const METRIC_LABELS: Record<PlanMetric, string> = {
  installs: "Installs",
  yearly_share: "Yearly mix",
  weekly_share: "Weekly mix",
  yearly_appu: "Yearly APPU",
  weekly_appu: "Weekly APPU",
  yearly_subs: "Yearly",
  weekly_subs: "Weekly",
};

export default function AppPlanBreakdown({ plans }: { plans: MobileAppPlanCountryRow[] }) {
  const [metric, setMetric] = useState<PlanMetric>("installs");
  const sorted = [...plans].sort((a, b) => metricValue(b, metric) - metricValue(a, metric) || totalSubs(b) - totalSubs(a));
  const preview = sorted.slice(0, PREVIEW_ROWS);

  return (
    <DashboardCard
      title="Weekly vs yearly"
      titleAccessory={
        <DashboardCardMetricPicker
          ariaLabel="Plan metric"
          value={metric}
          options={["installs", "yearly_share", "weekly_share", "yearly_appu", "weekly_appu", "yearly_subs", "weekly_subs"] as const}
          labels={METRIC_LABELS}
          onValueChange={setMetric}
        />
      }
      headerClassName="h-[46px] border-b-0 py-0 pr-2"
      contentClassName="h-[24.5rem] space-y-0 p-0 pr-0.5"
      footer={sorted.length > PREVIEW_ROWS ? <PlanDetails rows={sorted} metric={metric} /> : undefined}
    >
      <PlanTable rows={preview} metric={metric} />
    </DashboardCard>
  );
}

function PlanDetails({ rows, metric }: { rows: MobileAppPlanCountryRow[]; metric: PlanMetric }) {
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
            <DialogTitle>Weekly vs yearly</DialogTitle>
            <DialogDescription>
              {rows.length.toLocaleString("en-US")} {rows.length === 1 ? "country" : "countries"} for the selected period, sorted by {METRIC_LABELS[metric].toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 max-h-[65dvh] overflow-auto overscroll-contain border-t border-black/[0.06] p-0 pr-0.5">
            <PlanTable rows={rows} metric={metric} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

type PlanTooltipState = {
  row: MobileAppPlanCountryRow;
  label: string;
  marker: ReactNode;
  x: number;
  y: number;
};

function PlanTable({ rows, metric }: { rows: MobileAppPlanCountryRow[]; metric: PlanMetric }) {
  const [tooltip, setTooltip] = useState<PlanTooltipState | null>(null);
  const maxYearly = Math.max(0, ...rows.map((row) => row.yearlySubs));
  const maxWeekly = Math.max(0, ...rows.map((row) => row.weeklySubs));
  if (rows.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No plan mix yet.</div>;
  }

  return (
    <>
      <div className="min-w-0">
        {rows.map((row) => (
          <PlanRow
            key={row.country}
            row={row}
            metric={metric}
            maxYearly={maxYearly}
            maxWeekly={maxWeekly}
            onTooltipChange={setTooltip}
          />
        ))}
      </div>
      {tooltip && globalThis.document
        ? createPortal(<PlanTooltip tooltip={tooltip} />, globalThis.document.body)
        : null}
    </>
  );
}

function PlanRow({
  row,
  metric,
  maxYearly,
  maxWeekly,
  onTooltipChange,
}: {
  row: MobileAppPlanCountryRow;
  metric: PlanMetric;
  maxYearly: number;
  maxWeekly: number;
  onTooltipChange: (tooltip: PlanTooltipState | null) => void;
}) {
  const total = totalSubs(row);
  const yearlyWidth = total > 0 ? (row.yearlySubs / total) * 100 : 0;
  const weeklyWidth = total > 0 ? (row.weeklySubs / total) * 100 : 0;
  const label = countryName(row.country);
  const marker = row.country === "unknown" ? "??" : countryFlag(row.country);
  const updateTooltip = (event: PointerEvent<HTMLDivElement>) => {
    onTooltipChange({ row, label, marker, x: event.clientX, y: event.clientY });
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
        onTooltipChange({ row, label, marker, x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 });
      }}
      onBlur={() => onTooltipChange(null)}
    >
      <div className="relative h-8 min-w-0 overflow-hidden rounded-r-md">
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 ${weeklyWidth > 0 ? "" : "rounded-r-md"}`}
          style={{ width: `${yearlyWidth}%`, backgroundColor: YEARLY_COLOR, opacity: 0.88 }}
        />
        {weeklyWidth > 0 ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 rounded-r-md"
            style={{ left: `${yearlyWidth}%`, width: `${weeklyWidth}%`, backgroundColor: WEEKLY_COLOR, opacity: 0.88 }}
          />
        ) : null}
        <div className="relative z-10 flex h-full min-w-0 items-center gap-2 px-3 text-sm font-medium text-foreground">
          <span className="flex size-5 shrink-0 items-center justify-center text-base">{marker}</span>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <span className="shrink-0 font-mono text-xs font-medium tabular-nums">{formatMetric(row, metric)}</span>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20"
          style={{ clipPath: `inset(0 ${100 - yearlyWidth - weeklyWidth}% 0 0)` }}
        >
          <div className="flex h-full min-w-0 items-center gap-2 px-3 text-sm font-medium text-white">
            <span className="flex size-5 shrink-0 items-center justify-center text-base">{marker}</span>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <span className="shrink-0 font-mono text-xs font-medium tabular-nums">{formatMetric(row, metric)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanTooltip({ tooltip }: { tooltip: PlanTooltipState }) {
  const tooltipWidth = 220;
  const tooltipHeight = 168;
  const gap = 14;
  const left = Math.max(8, Math.min(tooltip.x + gap, window.innerWidth - tooltipWidth - 8));
  const top =
    tooltip.y + gap + tooltipHeight > window.innerHeight
      ? Math.max(8, tooltip.y - tooltipHeight - gap)
      : tooltip.y + gap;
  const metrics = [
    { label: "Yearly", value: `${formatInt(tooltip.row.yearlySubs)} · ${formatRate(yearlyShare(tooltip.row))}`, color: YEARLY_COLOR },
    { label: "Weekly", value: `${formatInt(tooltip.row.weeklySubs)} · ${formatRate(weeklyShare(tooltip.row))}`, color: WEEKLY_COLOR },
    { label: "Yearly APPU", value: formatPreciseCurrency(yearlyAppu(tooltip.row)) },
    { label: "Weekly APPU", value: formatPreciseCurrency(weeklyAppu(tooltip.row)) },
  ];

  return (
    <div
      className="dashboard-tooltip-shadow pointer-events-none fixed z-[100] grid min-w-56 gap-2 rounded-lg bg-[#f7f7f7] px-2.5 py-2 text-xs"
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
              {"color" in item && item.color ? (
                <span className="size-2 rounded-sm" style={{ backgroundColor: item.color }} />
              ) : null}
              {item.label}
            </span>
            <span className="font-mono font-medium tabular-nums text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function totalSubs(row: MobileAppPlanCountryRow) {
  return row.yearlySubs + row.weeklySubs;
}

function yearlyShare(row: MobileAppPlanCountryRow) {
  const total = totalSubs(row);
  return total > 0 ? row.yearlySubs / total : 0;
}

function weeklyShare(row: MobileAppPlanCountryRow) {
  const total = totalSubs(row);
  return total > 0 ? row.weeklySubs / total : 0;
}

function yearlyAppu(row: MobileAppPlanCountryRow) {
  return row.yearlySubs > 0 ? row.yearlyProceeds / row.yearlySubs : 0;
}

function weeklyAppu(row: MobileAppPlanCountryRow) {
  return row.weeklySubs > 0 ? row.weeklyProceeds / row.weeklySubs : 0;
}

function metricValue(row: MobileAppPlanCountryRow, metric: PlanMetric) {
  if (metric === "installs") return row.installs;
  if (metric === "yearly_share") return yearlyShare(row);
  if (metric === "weekly_share") return weeklyShare(row);
  if (metric === "yearly_appu") return yearlyAppu(row);
  if (metric === "weekly_appu") return weeklyAppu(row);
  if (metric === "yearly_subs") return row.yearlySubs;
  return row.weeklySubs;
}

function formatMetric(row: MobileAppPlanCountryRow, metric: PlanMetric) {
  if (metric === "weekly_share") return formatRate(weeklyShare(row));
  if (metric === "yearly_appu") return formatPreciseCurrency(yearlyAppu(row));
  if (metric === "weekly_appu") return formatPreciseCurrency(weeklyAppu(row));
  if (metric === "yearly_subs") return formatInt(row.yearlySubs);
  if (metric === "weekly_subs") return formatInt(row.weeklySubs);
  return formatRate(yearlyShare(row));
}

function countryFlag(code: string) {
  return code.toUpperCase().replace(/./g, (character) => String.fromCodePoint(127397 + character.charCodeAt(0)));
}

function countryName(code: string) {
  if (!code || code === "unknown") return "Unknown";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

function formatInt(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatRate(value: number) {
  return `${(value * 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}%`;
}

function formatPreciseCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
