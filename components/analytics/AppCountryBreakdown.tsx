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
const PROCEEDS_COLOR = "#f97316";
const INSTALL_BAR_SHARE = 72;
const PROCEEDS_BAR_SHARE = 100 - INSTALL_BAR_SHARE;
const PREVIEW_ROWS = 10;

type CountryMetric = "installs" | "proceeds";

export default function AppCountryBreakdown({ countries }: { countries: MobileAppCountryRow[] }) {
  const [metric, setMetric] = useState<CountryMetric>("installs");
  const sorted = [...countries].sort((a, b) => {
    const primary = metric === "proceeds" ? b.proceeds - a.proceeds : b.installs - a.installs;
    const secondary = metric === "proceeds" ? b.installs - a.installs : b.proceeds - a.proceeds;
    return primary || secondary;
  });
  const preview = sorted.slice(0, PREVIEW_ROWS);

  return (
    <DashboardCard
      title="Countries"
      titleAccessory={
        <CountryMetricPicker value={metric} onValueChange={setMetric} />
      }
      headerClassName="h-[46px] border-b-0 py-0 pr-2"
      contentClassName="h-[24.5rem] space-y-0 p-0 pr-0.5"
      footer={
        sorted.length > PREVIEW_ROWS ? (
          <CountryDetails rows={sorted} metric={metric} />
        ) : undefined
      }
    >
      <CountryTable rows={preview} metric={metric} />
    </DashboardCard>
  );
}

function CountryMetricPicker({
  value,
  onValueChange,
}: {
  value: CountryMetric;
  onValueChange: (value: CountryMetric) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue === "installs" || nextValue === "proceeds") onValueChange(nextValue);
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label="Countries metric"
        className="size-5 min-w-5 cursor-pointer justify-center gap-0 rounded-full border-0 bg-transparent p-0 text-muted-foreground shadow-none hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 data-[size=sm]:h-5 [&_svg]:!size-3.5"
      >
        <span className="sr-only">{value === "proceeds" ? "Proceeds" : "Installs"}</span>
      </SelectTrigger>
      <SelectContent side="bottom" align="start" className={DASHBOARD_POPOVER_CLASS}>
        <SelectItem value="installs" className={DASHBOARD_POPOVER_ITEM_CLASS}>Installs</SelectItem>
        <SelectItem value="proceeds" className={DASHBOARD_POPOVER_ITEM_CLASS}>Proceeds</SelectItem>
      </SelectContent>
    </Select>
  );
}

function CountryDetails({
  rows,
  metric,
}: {
  rows: MobileAppCountryRow[];
  metric: CountryMetric;
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
            <DialogTitle>Country details</DialogTitle>
            <DialogDescription>
              {rows.length.toLocaleString("en-US")} {rows.length === 1 ? "country" : "countries"} for the selected period, sorted by {metric}.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 max-h-[65dvh] overflow-auto overscroll-contain border-t border-black/[0.06] p-0 pr-0.5">
            <CountryTable rows={rows} metric={metric} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

type CountryTooltipState = {
  row: MobileAppCountryRow;
  label: string;
  marker: ReactNode;
  x: number;
  y: number;
};

function CountryTable({
  rows,
  metric,
}: {
  rows: MobileAppCountryRow[];
  metric: CountryMetric;
}) {
  const [tooltip, setTooltip] = useState<CountryTooltipState | null>(null);
  const maxInstalls = Math.max(0, ...rows.map((row) => row.installs));
  const maxProceeds = Math.max(0, ...rows.map((row) => row.proceeds));
  if (rows.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No country data yet.</div>;
  }

  return (
    <>
      <div className="min-w-0">
        {rows.map((row) => (
          <CountryRow
            key={row.country}
            row={row}
            metric={metric}
            maxInstalls={maxInstalls}
            maxProceeds={maxProceeds}
            onTooltipChange={setTooltip}
          />
        ))}
      </div>
      {tooltip && globalThis.document
        ? createPortal(<CountryTooltip tooltip={tooltip} />, globalThis.document.body)
        : null}
    </>
  );
}

function CountryRow({
  row,
  metric,
  maxInstalls,
  maxProceeds,
  onTooltipChange,
}: {
  row: MobileAppCountryRow;
  metric: CountryMetric;
  maxInstalls: number;
  maxProceeds: number;
  onTooltipChange: (tooltip: CountryTooltipState | null) => void;
}) {
  const hasProceedsScale = maxProceeds > 0;
  const installWidth = barPercent(row.installs, maxInstalls, hasProceedsScale ? INSTALL_BAR_SHARE : 100);
  const proceedsWidth = barPercent(row.proceeds, maxProceeds, PROCEEDS_BAR_SHARE);
  const barWidth = Math.min(100, installWidth + proceedsWidth);
  const label = countryName(row.country);
  const marker = row.country === "unknown" ? "??" : countryFlag(row.country);
  const metricValue = metric === "proceeds" ? formatCurrency(row.proceeds) : formatInt(row.installs);
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
        onTooltipChange({
          row,
          label,
          marker,
          x: bounds.left + bounds.width / 2,
          y: bounds.top + bounds.height / 2,
        });
      }}
      onBlur={() => onTooltipChange(null)}
    >
      <div className="relative h-8 min-w-0 overflow-hidden rounded-r-md">
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 ${proceedsWidth > 0 ? "" : "rounded-r-md"}`}
          style={{ width: `${installWidth}%`, backgroundColor: INSTALL_COLOR, opacity: 0.88 }}
        />
        {proceedsWidth > 0 ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 rounded-r-md"
            style={{ left: `${installWidth}%`, width: `${proceedsWidth}%`, backgroundColor: PROCEEDS_COLOR, opacity: 0.88 }}
          />
        ) : null}
        <div className="relative z-10 flex h-full min-w-0 items-center gap-2 px-3 text-sm font-medium text-foreground">
          <span className="flex size-5 shrink-0 items-center justify-center text-base">{marker}</span>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          <span className="shrink-0 font-mono text-xs font-medium tabular-nums">{metricValue}</span>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20"
          style={{ clipPath: `inset(0 ${100 - barWidth}% 0 0)` }}
        >
          <div className="flex h-full min-w-0 items-center gap-2 px-3 text-sm font-medium text-white">
            <span className="flex size-5 shrink-0 items-center justify-center text-base">{marker}</span>
            <span className="min-w-0 flex-1 truncate">{label}</span>
            <span className="shrink-0 font-mono text-xs font-medium tabular-nums">{metricValue}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CountryTooltip({ tooltip }: { tooltip: CountryTooltipState }) {
  const tooltipWidth = 192;
  const tooltipHeight = 116;
  const gap = 14;
  const left = Math.max(8, Math.min(tooltip.x + gap, window.innerWidth - tooltipWidth - 8));
  const top =
    tooltip.y + gap + tooltipHeight > window.innerHeight
      ? Math.max(8, tooltip.y - tooltipHeight - gap)
      : tooltip.y + gap;
  const appu = tooltip.row.installs > 0 ? tooltip.row.proceeds / tooltip.row.installs : 0;
  const metrics = [
    { label: "Installs", value: formatInt(tooltip.row.installs), color: INSTALL_COLOR },
    { label: "Proceeds", value: formatCurrency(tooltip.row.proceeds), color: PROCEEDS_COLOR },
    { label: "APPU", value: formatPreciseCurrency(appu), color: "oklch(0.55 0.02 250)" },
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPreciseCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
