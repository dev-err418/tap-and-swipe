"use client";

import { useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Maximize2 } from "lucide-react";
import type { MobileAppCountryRow } from "@/lib/mobile-app-analytics";
import { DashboardCard } from "@/components/analytics/DashboardCard";
import { DashboardCardMetricPicker } from "@/components/analytics/DashboardCardMetricPicker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const INSTALL_COLOR = "#1d4ed8";
const PAID_COLOR = "#f97316";
const PRIMARY_BAR_SHARE = 72;
const SECONDARY_BAR_SHARE = 100 - PRIMARY_BAR_SHARE;
const PREVIEW_ROWS = 10;

type ConversionMetric =
  | "installs"
  | "paid"
  | "install_to_paid"
  | "trials"
  | "install_to_trial"
  | "trial_to_paid";

const METRIC_LABELS: Record<ConversionMetric, string> = {
  installs: "Installs",
  paid: "Paid",
  install_to_paid: "Install → paid",
  trials: "Trials",
  install_to_trial: "Install → trial",
  trial_to_paid: "Trial → paid",
};

const BASE_OPTIONS = ["installs", "paid", "install_to_paid"] as const;
const TRIAL_OPTIONS = ["trials", "install_to_trial", "trial_to_paid"] as const;

export default function AppConversionBreakdown({ countries }: { countries: MobileAppCountryRow[] }) {
  const hasTrials = countries.some((row) => row.trials > 0);
  const options = hasTrials ? [...BASE_OPTIONS, ...TRIAL_OPTIONS] : [...BASE_OPTIONS];
  const [metric, setMetric] = useState<ConversionMetric>("installs");
  const sorted = [...countries].sort((a, b) => metricValue(b, metric) - metricValue(a, metric) || b.installs - a.installs);
  const preview = sorted.slice(0, PREVIEW_ROWS);

  return (
    <DashboardCard
      title="CR"
      titleAccessory={
        <DashboardCardMetricPicker
          ariaLabel="Conversion metric"
          value={metric}
          options={options}
          labels={METRIC_LABELS}
          onValueChange={setMetric}
        />
      }
      headerClassName="h-[46px] border-b-0 py-0 pr-2"
      contentClassName="h-[24.5rem] space-y-0 p-0 pr-0.5"
      footer={
        sorted.length > PREVIEW_ROWS ? <ConversionDetails rows={sorted} metric={metric} /> : undefined
      }
    >
      <ConversionTable rows={preview} metric={metric} />
    </DashboardCard>
  );
}

function ConversionDetails({ rows, metric }: { rows: MobileAppCountryRow[]; metric: ConversionMetric }) {
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
            <DialogTitle>Conversion details</DialogTitle>
            <DialogDescription>
              {rows.length.toLocaleString("en-US")} {rows.length === 1 ? "country" : "countries"} for the selected period, sorted by {METRIC_LABELS[metric].toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 max-h-[65dvh] overflow-auto overscroll-contain border-t border-black/[0.06] p-0 pr-0.5">
            <ConversionTable rows={rows} metric={metric} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

type ConversionTooltipState = {
  row: MobileAppCountryRow;
  label: string;
  marker: ReactNode;
  x: number;
  y: number;
};

function ConversionTable({ rows, metric }: { rows: MobileAppCountryRow[]; metric: ConversionMetric }) {
  const [tooltip, setTooltip] = useState<ConversionTooltipState | null>(null);
  const maxInstalls = Math.max(0, ...rows.map((row) => row.installs));
  const maxPaid = Math.max(0, ...rows.map((row) => row.paid));
  if (rows.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No conversion data yet.</div>;
  }

  return (
    <>
      <div className="min-w-0">
        {rows.map((row) => (
          <ConversionRow
            key={row.country}
            row={row}
            metric={metric}
            maxInstalls={maxInstalls}
            maxPaid={maxPaid}
            onTooltipChange={setTooltip}
          />
        ))}
      </div>
      {tooltip && globalThis.document
        ? createPortal(<ConversionTooltip tooltip={tooltip} />, globalThis.document.body)
        : null}
    </>
  );
}

function ConversionRow({
  row,
  metric,
  maxInstalls,
  maxPaid,
  onTooltipChange,
}: {
  row: MobileAppCountryRow;
  metric: ConversionMetric;
  maxInstalls: number;
  maxPaid: number;
  onTooltipChange: (tooltip: ConversionTooltipState | null) => void;
}) {
  const showPaidBar = metric !== "install_to_paid" && maxPaid > 0;
  const installWidth = barPercent(row.installs, maxInstalls, showPaidBar ? PRIMARY_BAR_SHARE : 100);
  const paidWidth = showPaidBar ? barPercent(row.paid, maxPaid, SECONDARY_BAR_SHARE) : barPercent(installToPaid(row), 1, 100);
  const barWidth = metric === "install_to_paid" ? paidWidth : Math.min(100, installWidth + paidWidth);
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
        {metric === "install_to_paid" ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 rounded-r-md"
            style={{ width: `${barWidth}%`, backgroundColor: INSTALL_COLOR, opacity: 0.88 }}
          />
        ) : (
          <>
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-y-0 left-0 ${showPaidBar ? "" : "rounded-r-md"}`}
              style={{ width: `${installWidth}%`, backgroundColor: INSTALL_COLOR, opacity: 0.88 }}
            />
            {showPaidBar ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 rounded-r-md"
                style={{ left: `${installWidth}%`, width: `${paidWidth}%`, backgroundColor: PAID_COLOR, opacity: 0.88 }}
              />
            ) : null}
          </>
        )}
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

function ConversionTooltip({ tooltip }: { tooltip: ConversionTooltipState }) {
  const tooltipWidth = 192;
  const tooltipHeight = tooltip.row.trials > 0 ? 172 : 116;
  const gap = 14;
  const left = Math.max(8, Math.min(tooltip.x + gap, window.innerWidth - tooltipWidth - 8));
  const top =
    tooltip.y + gap + tooltipHeight > window.innerHeight
      ? Math.max(8, tooltip.y - tooltipHeight - gap)
      : tooltip.y + gap;
  const metrics = [
    { label: "Installs", value: formatInt(tooltip.row.installs), color: INSTALL_COLOR },
    { label: "Paid", value: formatInt(tooltip.row.paid), color: PAID_COLOR },
    ...(tooltip.row.trials > 0
      ? [
          { label: "Trials", value: formatInt(tooltip.row.trials), color: PAID_COLOR },
          { label: "Install → trial", value: formatRate(installToTrial(tooltip.row)) },
          { label: "Trial → paid", value: formatRate(trialToPaid(tooltip.row)) },
        ]
      : []),
    { label: "Install → paid", value: formatRate(installToPaid(tooltip.row)) },
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

function metricValue(row: MobileAppCountryRow, metric: ConversionMetric) {
  if (metric === "installs") return row.installs;
  if (metric === "paid") return row.paid;
  if (metric === "trials") return row.trials;
  if (metric === "install_to_trial") return installToTrial(row);
  if (metric === "trial_to_paid") return trialToPaid(row);
  return installToPaid(row);
}

function formatMetric(row: MobileAppCountryRow, _metric: ConversionMetric) {
  return formatRate(installToPaid(row));
}

function installToPaid(row: MobileAppCountryRow) {
  return row.installs > 0 ? row.paid / row.installs : 0;
}

function installToTrial(row: MobileAppCountryRow) {
  return row.installs > 0 ? row.trials / row.installs : 0;
}

function trialToPaid(row: MobileAppCountryRow) {
  return row.trials > 0 ? row.converted / row.trials : 0;
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
