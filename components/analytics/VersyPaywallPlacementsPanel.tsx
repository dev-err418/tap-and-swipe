"use client";

import { useEffect, useState } from "react";
import type { VersyPlacementReport, VersyPlacementRow } from "@/lib/versy-paywall-placements";
import { DASHBOARD_SURFACE_CLASS } from "./dashboard-surface";
import { cn } from "@/lib/utils";

const count = (value: number) => value.toLocaleString("en-US");
const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

function conversionInterval(conversions: number, views: number) {
  if (views <= 0) return null;
  const z = 1.96;
  const rate = conversions / views;
  const denominator = 1 + z ** 2 / views;
  const center = (rate + z ** 2 / (2 * views)) / denominator;
  const margin = z * Math.sqrt(rate * (1 - rate) / views + z ** 2 / (4 * views ** 2)) / denominator;
  return { rate, lower: Math.max(0, center - margin), upper: Math.min(1, center + margin) };
}

function conversionDomain(rows: VersyPlacementRow[]) {
  const intervals = rows.flatMap((row) => {
    const interval = conversionInterval(row.purchased, row.viewed);
    return interval ? [interval] : [];
  });
  if (!intervals.length) return { minimum: 0, maximum: 1 };
  const minimum = Math.min(...intervals.map((interval) => interval.lower));
  const maximum = Math.max(...intervals.map((interval) => interval.upper));
  return maximum > minimum ? { minimum, maximum } : { minimum: Math.max(0, minimum - 0.005), maximum: Math.min(1, maximum + 0.005) };
}

export default function VersyPaywallPlacementsPanel() {
  const [report, setReport] = useState<VersyPlacementReport | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/analytics/versy-paywall-placements", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Placement analytics failed to load");
        return response.json() as Promise<VersyPlacementReport>;
      })
      .then(setReport)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailed(true);
      });
    return () => controller.abort();
  }, []);

  return <section aria-label="Versy paywall placements" className="space-y-2">
    <div className="px-1">
      <h2 className="text-sm font-semibold">Native SwiftUI paywalls</h2>
      <p className="text-xs text-muted-foreground">Production · last 30 days · unique people per placement</p>
    </div>
    <div>
      {failed || report?.status === "unavailable" || report?.status === "limited" || report?.status === "setup_required"
        ? <p className={cn(DASHBOARD_SURFACE_CLASS, "p-5 text-sm text-muted-foreground")}>{report?.note ?? "Placement analytics could not be loaded. Refresh to retry."}</p>
        : !report ? <p className={cn(DASHBOARD_SURFACE_CLASS, "p-5 text-sm text-muted-foreground")}>Loading placements…</p>
        : <div className="space-y-6">
          <ResultsTable title="Paywalls" rows={report.onboarding} />
          <ResultsTable title="Placements" rows={report.rows} />
          {report.status === "empty" ? <p className="text-sm text-muted-foreground">No production placement events in this period yet.</p> : null}
          <p className="px-1 text-xs text-muted-foreground">The three onboarding rows separate Bible Widget, Bible Widget Shorter, and Bible Scroll. Bible Scroll uses its own placement ID. Its current app screen records reach; views and conversions remain unavailable until it also records a paywall view. Native entry points appear even with no traffic. The embedded widget rows are inferred from the saved variant because they share a raw placement ID. Historical Prayer journey placements remain separate when they have traffic. A view counts as reach when the app did not send a separate reach event. Conversions are successful app purchase results after a view in this period. Versy does not yet record verified revenue, refunds, or immutable purchase attribution by native paywall, so those columns and winner estimates are unavailable.</p>
        </div>}
    </div>
  </section>;
}

function ResultsTable({ title, rows }: { title: string; rows: VersyPlacementRow[] }) {
  const domain = conversionDomain(rows);
  const columns = [
    ["Total APPU", "Net proceeds divided by assigned users. Versy does not yet have verified paywall-level purchase attribution."],
    ["Probability best", "A winner estimate requires verified per-user revenue and randomized paywall assignments."],
    ["Conv. rate", "Successful app purchase results after a view, divided by unique viewers. The bar shows a 95% Wilson interval."],
    ["Users", "Unique people who reached this native paywall or placement."],
    ["Views", "Unique people who saw this native paywall."],
    ["Attempts", "Unique people who attempted a purchase."],
    ["Conversions", "Unique people with a successful app purchase result after a view in this period. Store revenue is not verified here."],
    ["Proceeds", "Verified, attributed proceeds are unavailable for these native paywalls."],
    ["Refunds", "Refund attribution is unavailable for these native paywalls."],
    ["Refund rate", "Refund attribution is unavailable for these native paywalls."],
  ] as const;
  return <section className="space-y-2 pt-2">
    <h3 className="px-1 text-sm font-semibold">{title}</h3>
    <div className={cn(DASHBOARD_SURFACE_CLASS, "overflow-hidden")}>
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full min-w-[1220px] text-left text-xs">
          <thead><tr className="border-b border-black/[0.06] text-muted-foreground">
            <th className="min-w-[180px] px-5 py-3 font-medium">{title === "Placements" ? "Placement" : "Paywall"}</th>
            {columns.map(([label, hint]) => <th key={label} className={cn("px-3 py-3 text-right font-medium", label === "Conv. rate" ? "min-w-[260px]" : label === "Probability best" ? "min-w-[160px]" : "min-w-24")}>
              <abbr title={hint} className="cursor-help whitespace-nowrap no-underline">{label}</abbr>
            </th>)}
          </tr></thead>
          <tbody>{rows.map((row) => <tr key={row.placement} className="border-b border-black/[0.04] last:border-0">
            <td className="px-5 py-4 font-medium">{row.placement === "onboarding_bible_widget" ? "Bible Widget embedded paywall" : row.placement === "onboarding_bible_widget_shorter" ? "Bible Widget Shorter embedded paywall" : row.placement === "onboarding_scroll_bible" ? "Bible Scroll trial paywall" : row.placement === "verse_study_upgrade" ? "Verse study upgrade" : row.placement}</td>
            <Cell>—</Cell><Cell>—</Cell>
            <ConversionRateCell conversions={row.purchased} views={row.viewed} domain={domain} />
            <Cell>{count(row.reached)}</Cell><Cell>{count(row.viewed)}</Cell><Cell>{count(row.attempted)}</Cell><Cell>{count(row.purchased)}</Cell>
            <Cell>—</Cell><Cell>—</Cell><Cell>—</Cell>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  </section>;
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="whitespace-nowrap px-3 py-4 text-right tabular-nums">{children}</td>;
}

function ConversionRateCell({ conversions, views, domain }: { conversions: number; views: number; domain: { minimum: number; maximum: number } }) {
  const interval = conversionInterval(conversions, views);
  if (!interval) return <Cell>—</Cell>;
  const position = (value: number) => 2 + Math.max(0, Math.min(1, (value - domain.minimum) / (domain.maximum - domain.minimum))) * 96;
  const lowerPosition = position(interval.lower);
  const upperPosition = position(interval.upper);
  const range = `${percent(interval.lower)} – ${percent(interval.upper)}`;
  return <td className="whitespace-nowrap px-3 py-4 tabular-nums">
    <div className="flex items-center justify-end gap-3">
      <span className="min-w-11 text-right">{percent(interval.rate)}</span>
      <div className="group relative h-5 w-44 shrink-0 outline-none" tabIndex={0} aria-label={`95% conversion range ${range}`}>
        <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#1d4ed8]/10" />
        <span className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#1d4ed8]/55" style={{ left: `${lowerPosition}%`, width: `${upperPosition - lowerPosition}%` }} />
        <span className="absolute top-1/2 z-10 h-[18px] w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/45" style={{ left: `${lowerPosition}%` }} />
        <span className="absolute top-1/2 z-10 h-[18px] w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/45" style={{ left: `${upperPosition}%` }} />
        <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#1d4ed8] shadow-[0_0_0_2px_rgba(29,78,216,0.16)]" style={{ left: `${position(interval.rate)}%` }} />
        <span role="tooltip" className="dashboard-tooltip-shadow pointer-events-none absolute bottom-full right-0 z-20 mb-2 hidden rounded-lg border border-[#1d4ed8]/15 bg-[#f7f7f7] px-3 py-2 text-xs font-semibold text-black group-hover:block group-focus:block">{range}</span>
      </div>
    </div>
  </td>;
}
