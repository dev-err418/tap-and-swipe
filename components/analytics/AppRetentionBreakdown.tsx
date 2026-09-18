"use client";

import { useState, type PointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Maximize2 } from "lucide-react";
import type { MobileAppRetentionCountryRow, RetentionSlice } from "@/lib/mobile-app-analytics";
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

type RetentionMetric = "installs" | "d1" | "d7" | "d30";

const METRIC_LABELS: Record<RetentionMetric, string> = {
  installs: "Installs",
  d1: "Day 1",
  d7: "Day 7",
  d30: "Day 30",
};

export default function AppRetentionBreakdown({ rows }: { rows: MobileAppRetentionCountryRow[] }) {
  const [metric, setMetric] = useState<RetentionMetric>("installs");
  const sorted = [...rows].sort((a, b) => metricValue(b, metric) - metricValue(a, metric) || b.installs - a.installs);
  const preview = sorted.slice(0, PREVIEW_ROWS);

  return (
    <DashboardCard
      title="Retention"
      titleAccessory={
        <DashboardCardMetricPicker
          ariaLabel="Retention metric"
          value={metric}
          options={["installs", "d1", "d7", "d30"] as const}
          labels={METRIC_LABELS}
          onValueChange={setMetric}
        />
      }
      headerClassName="h-[46px] border-b-0 py-0 pr-2"
      contentClassName="h-[24.5rem] space-y-0 p-0 pr-0.5"
      footer={sorted.length > PREVIEW_ROWS ? <RetentionDetails rows={sorted} metric={metric} /> : undefined}
    >
      <RetentionTable rows={preview} metric={metric} />
    </DashboardCard>
  );
}

function RetentionDetails({ rows, metric }: { rows: MobileAppRetentionCountryRow[]; metric: RetentionMetric }) {
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
            <DialogTitle>Retention</DialogTitle>
            <DialogDescription>
              {rows.length.toLocaleString("en-US")} {rows.length === 1 ? "country" : "countries"} for the selected period, sorted by {METRIC_LABELS[metric].toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 max-h-[65dvh] overflow-auto overscroll-contain border-t border-black/[0.06] p-0 pr-0.5">
            <RetentionTable rows={rows} metric={metric} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

type RetentionTooltipState = {
  row: MobileAppRetentionCountryRow;
  label: string;
  marker: ReactNode;
  x: number;
  y: number;
};

function RetentionTable({ rows, metric }: { rows: MobileAppRetentionCountryRow[]; metric: RetentionMetric }) {
  const [tooltip, setTooltip] = useState<RetentionTooltipState | null>(null);
  if (rows.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No retention data yet.</div>;
  }

  return (
    <>
      <div className="min-w-0">
        {rows.map((row) => (
          <RetentionRow key={row.country} row={row} metric={metric} onTooltipChange={setTooltip} />
        ))}
      </div>
      {tooltip && globalThis.document
        ? createPortal(<RetentionTooltip tooltip={tooltip} />, globalThis.document.body)
        : null}
    </>
  );
}

function RetentionRow({
  row,
  metric,
  onTooltipChange,
}: {
  row: MobileAppRetentionCountryRow;
  metric: RetentionMetric;
  onTooltipChange: (tooltip: RetentionTooltipState | null) => void;
}) {
  const day = displayedDay(metric);
  const yearlyRate = rate(row.yearly[day]);
  const weeklyRate = rate(row.weekly[day]);
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
          className="pointer-events-none absolute inset-y-0 left-0"
          style={{ width: `${yearlyRate * 50}%`, backgroundColor: YEARLY_COLOR, opacity: 0.88 }}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 rounded-r-md"
          style={{ left: "50%", width: `${weeklyRate * 50}%`, backgroundColor: WEEKLY_COLOR, opacity: 0.88 }}
        />
        <div className="relative z-10 flex h-full min-w-0 items-center gap-2 px-3 text-sm font-medium text-foreground">
          <span className="flex size-5 shrink-0 items-center justify-center text-base">{marker}</span>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <span className="shrink-0 font-mono text-xs font-medium tabular-nums">{formatRate(rate(row.overall[day]))}</span>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20"
          style={{ clipPath: `inset(0 ${100 - yearlyRate * 50 - weeklyRate * 50}% 0 0)` }}
        >
          <div className="flex h-full min-w-0 items-center gap-2 px-3 text-sm font-medium text-white">
            <span className="flex size-5 shrink-0 items-center justify-center text-base">{marker}</span>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <span className="shrink-0 font-mono text-xs font-medium tabular-nums">{formatRate(rate(row.overall[day]))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RetentionTooltip({ tooltip }: { tooltip: RetentionTooltipState }) {
  const tooltipWidth = 220;
  const tooltipHeight = 188;
  const gap = 14;
  const left = Math.max(8, Math.min(tooltip.x + gap, window.innerWidth - tooltipWidth - 8));
  const top =
    tooltip.y + gap + tooltipHeight > window.innerHeight
      ? Math.max(8, tooltip.y - tooltipHeight - gap)
      : tooltip.y + gap;
  const metrics = [
    { label: "Day 1", value: formatSlice(tooltip.row.overall.d1) },
    { label: "Day 7", value: formatSlice(tooltip.row.overall.d7) },
    { label: "Day 30", value: formatSlice(tooltip.row.overall.d30) },
    { label: "Yearly D1", value: formatSlice(tooltip.row.yearly.d1), color: YEARLY_COLOR },
    { label: "Yearly D7", value: formatSlice(tooltip.row.yearly.d7), color: YEARLY_COLOR },
    { label: "Yearly D30", value: formatSlice(tooltip.row.yearly.d30), color: YEARLY_COLOR },
    { label: "Weekly D1", value: formatSlice(tooltip.row.weekly.d1), color: WEEKLY_COLOR },
    { label: "Weekly D7", value: formatSlice(tooltip.row.weekly.d7), color: WEEKLY_COLOR },
    { label: "Weekly D30", value: formatSlice(tooltip.row.weekly.d30), color: WEEKLY_COLOR },
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

function displayedDay(metric: RetentionMetric): "d1" | "d7" | "d30" {
  if (metric === "d7") return "d7";
  if (metric === "d30") return "d30";
  return "d1";
}

function metricValue(row: MobileAppRetentionCountryRow, metric: RetentionMetric) {
  if (metric === "installs") return row.installs;
  return rate(row.overall[metric]);
}

function rate(slice: RetentionSlice) {
  return slice.eligible > 0 ? slice.retained / slice.eligible : 0;
}

function formatSlice(slice: RetentionSlice) {
  if (slice.eligible <= 0) return "—";
  return `${formatRate(rate(slice))} · ${slice.retained}/${slice.eligible}`;
}

function formatRate(value: number) {
  return `${(value * 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}%`;
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
