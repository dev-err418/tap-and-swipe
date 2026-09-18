"use client";

import { useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Maximize2 } from "lucide-react";
import type { MobileAppCountryRow } from "@/lib/mobile-app-analytics";
import { DashboardCard } from "@/components/analytics/DashboardCard";
import {
  DASHBOARD_POPOVER_CLASS,
  DASHBOARD_POPOVER_ITEM_CLASS,
} from "@/components/analytics/dashboard-surface";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const INSTALL_COLOR = "#1d4ed8";
const TRIAL_COLOR = "#f97316";
const PRIMARY_BAR_SHARE = 72;
const SECONDARY_BAR_SHARE = 100 - PRIMARY_BAR_SHARE;
const PREVIEW_ROWS = 10;

type TrialMetric = "installs" | "trials" | "install_to_trial" | "trial_to_paid" | "install_to_paid";

const METRIC_LABELS: Record<TrialMetric, string> = {
  installs: "Installs",
  trials: "Trials",
  install_to_trial: "Install → trial",
  trial_to_paid: "Trial → paid",
  install_to_paid: "Install → paid",
};

export default function AppTrialBreakdown({ countries }: { countries: MobileAppCountryRow[] }) {
  const [metric, setMetric] = useState<TrialMetric>("trials");
  const sorted = [...countries].sort((a, b) => metricValue(b, metric) - metricValue(a, metric) || b.installs - a.installs);
  const preview = sorted.slice(0, PREVIEW_ROWS);

  return (
    <DashboardCard
      title="Trials"
      titleAccessory={<TrialMetricPicker value={metric} onValueChange={setMetric} />}
      headerClassName="h-[46px] border-b-0 py-0 pr-2"
      contentClassName="h-[24.5rem] space-y-0 p-0 pr-0.5"
      footer={
        sorted.length > PREVIEW_ROWS ? (
          <TrialDetails rows={sorted} metric={metric} />
        ) : undefined
      }
    >
      <TrialTable rows={preview} metric={metric} />
    </DashboardCard>
  );
}

function TrialMetricPicker({
  value,
  onValueChange,
}: {
  value: TrialMetric;
  onValueChange: (value: TrialMetric) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        if (
          nextValue === "installs" ||
          nextValue === "trials" ||
          nextValue === "install_to_trial" ||
          nextValue === "trial_to_paid" ||
          nextValue === "install_to_paid"
        ) {
          onValueChange(nextValue);
        }
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label="Trials metric"
        className="size-5 min-w-5 cursor-pointer justify-center gap-0 rounded-full border-0 bg-transparent p-0 text-muted-foreground shadow-none hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 data-[size=sm]:h-5 [&_svg]:!size-3.5"
      >
        <span className="sr-only">{METRIC_LABELS[value]}</span>
      </SelectTrigger>
      <SelectContent side="bottom" align="start" className={DASHBOARD_POPOVER_CLASS}>
        {(Object.keys(METRIC_LABELS) as TrialMetric[]).map((item) => (
          <SelectItem key={item} value={item} className={DASHBOARD_POPOVER_ITEM_CLASS}>
            {METRIC_LABELS[item]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TrialDetails({ rows, metric }: { rows: MobileAppCountryRow[]; metric: TrialMetric }) {
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
            <DialogTitle>Trial details</DialogTitle>
            <DialogDescription>
              {rows.length.toLocaleString("en-US")} {rows.length === 1 ? "country" : "countries"} for the selected period, sorted by {METRIC_LABELS[metric].toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 max-h-[65dvh] overflow-auto overscroll-contain border-t border-black/[0.06] p-0 pr-0.5">
            <TrialTable rows={rows} metric={metric} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

type TrialTooltipState = {
  row: MobileAppCountryRow;
  label: string;
  marker: ReactNode;
  x: number;
  y: number;
};

function TrialTable({ rows, metric }: { rows: MobileAppCountryRow[]; metric: TrialMetric }) {
  const [tooltip, setTooltip] = useState<TrialTooltipState | null>(null);
  const maxPrimary = Math.max(0, ...rows.map((row) => primaryBarValue(row, metric)));
  const maxSecondary = Math.max(0, ...rows.map((row) => secondaryBarValue(row, metric)));
  if (rows.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No trial data yet.</div>;
  }

  return (
    <>
      <div className="min-w-0">
        {rows.map((row) => (
          <TrialRow
            key={row.country}
            row={row}
            metric={metric}
            maxPrimary={maxPrimary}
            maxSecondary={maxSecondary}
            onTooltipChange={setTooltip}
          />
        ))}
      </div>
      {tooltip && globalThis.document
        ? createPortal(<TrialTooltip tooltip={tooltip} />, globalThis.document.body)
        : null}
    </>
  );
}

function TrialRow({
  row,
  metric,
  maxPrimary,
  maxSecondary,
  onTooltipChange,
}: {
  row: MobileAppCountryRow;
  metric: TrialMetric;
  maxPrimary: number;
  maxSecondary: number;
  onTooltipChange: (tooltip: TrialTooltipState | null) => void;
}) {
  const hasSecondary = maxSecondary > 0 && (metric === "installs" || metric === "trials");
  const primaryWidth = barPercent(primaryBarValue(row, metric), maxPrimary, hasSecondary ? PRIMARY_BAR_SHARE : 100);
  const secondaryWidth = hasSecondary ? barPercent(secondaryBarValue(row, metric), maxSecondary, SECONDARY_BAR_SHARE) : 0;
  const barWidth = Math.min(100, primaryWidth + secondaryWidth);
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
          className={`pointer-events-none absolute inset-y-0 left-0 ${secondaryWidth > 0 ? "" : "rounded-r-md"}`}
          style={{ width: `${primaryWidth}%`, backgroundColor: INSTALL_COLOR, opacity: 0.88 }}
        />
        {secondaryWidth > 0 ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 rounded-r-md"
            style={{ left: `${primaryWidth}%`, width: `${secondaryWidth}%`, backgroundColor: TRIAL_COLOR, opacity: 0.88 }}
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
          style={{ clipPath: `inset(0 ${100 - barWidth}% 0 0)` }}
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

function TrialTooltip({ tooltip }: { tooltip: TrialTooltipState }) {
  const tooltipWidth = 208;
  const tooltipHeight = 172;
  const gap = 14;
  const left = Math.max(8, Math.min(tooltip.x + gap, window.innerWidth - tooltipWidth - 8));
  const top =
    tooltip.y + gap + tooltipHeight > window.innerHeight
      ? Math.max(8, tooltip.y - tooltipHeight - gap)
      : tooltip.y + gap;
  const metrics = [
    { label: "Installs", value: formatInt(tooltip.row.installs), color: INSTALL_COLOR },
    { label: "Trials", value: formatInt(tooltip.row.trials), color: TRIAL_COLOR },
    { label: "Install → trial", value: formatRate(installToTrial(tooltip.row)) },
    { label: "Trial → paid", value: formatRate(trialToPaid(tooltip.row)) },
    { label: "Install → paid", value: formatRate(installToPaid(tooltip.row)) },
  ];

  return (
    <div
      className="dashboard-tooltip-shadow pointer-events-none fixed z-[100] grid min-w-52 gap-2 rounded-lg bg-[#f7f7f7] px-2.5 py-2 text-xs"
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

function metricValue(row: MobileAppCountryRow, metric: TrialMetric) {
  if (metric === "installs") return row.installs;
  if (metric === "trials") return row.trials;
  if (metric === "install_to_trial") return installToTrial(row);
  if (metric === "trial_to_paid") return trialToPaid(row);
  return installToPaid(row);
}

function primaryBarValue(row: MobileAppCountryRow, metric: TrialMetric) {
  if (metric === "trial_to_paid") return row.trials;
  if (metric === "install_to_trial") return row.installs;
  if (metric === "trials") return row.installs;
  return row.installs;
}

function secondaryBarValue(row: MobileAppCountryRow, metric: TrialMetric) {
  if (metric === "trial_to_paid") return row.converted;
  return row.trials;
}

function installToTrial(row: MobileAppCountryRow) {
  return row.installs > 0 ? row.trials / row.installs : 0;
}

function trialToPaid(row: MobileAppCountryRow) {
  return row.trials > 0 ? row.converted / row.trials : 0;
}

function installToPaid(row: MobileAppCountryRow) {
  return row.installs > 0 ? row.converted / row.installs : 0;
}

function formatMetric(row: MobileAppCountryRow, metric: TrialMetric) {
  if (metric === "installs") return formatInt(row.installs);
  if (metric === "trials") return formatInt(row.trials);
  if (metric === "install_to_trial") return formatRate(installToTrial(row));
  if (metric === "trial_to_paid") return formatRate(trialToPaid(row));
  return formatRate(installToPaid(row));
}

function barPercent(value: number, max: number, share: number) {
  if (max <= 0 || value <= 0) return 0;
  return (value / max) * share;
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
  return `${(value * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}
