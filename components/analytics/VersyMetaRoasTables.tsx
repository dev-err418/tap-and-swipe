"use client";

import { Fragment, use, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { DashboardCard } from "./DashboardCard";
import VersyBlendedRoasChart from "./VersyBlendedRoasChart";
import { buildMatrix, overlapsGap, multiple, type Amounts, type Report } from "@/lib/versy-acquisition-report";
import { cn } from "@/lib/utils";
import { countryFlag } from "@/lib/stats-helpers";
import { marketCountryLabel } from "@/lib/analytics-markets";

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const label = (day: string) => date.format(Date.parse(day));
const hatching = "repeating-linear-gradient(125deg, transparent 0 11px, color-mix(in srgb, var(--foreground) 7%, transparent) 11px 12px)";
const cell = "whitespace-nowrap border-l border-t border-foreground/[0.06] px-3 py-2 text-right tabular-nums";
const sticky = "sticky left-0 z-10 w-[clamp(9rem,32vw,17rem)] min-w-[clamp(9rem,32vw,17rem)] max-w-[clamp(9rem,32vw,17rem)] border-t border-foreground/[0.06] bg-card px-3 py-2 text-left";

export default function DeferredVersyMetaRoas({ report, country }: { report: Promise<Report>; country: string }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    const timer = window.setInterval(refresh, 301000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [router]);
  return <VersyMetaRoasTables report={use(report)} country={country} />;
}

function Matrix({ report, country, weekly }: { report: Report; country: string; weekly: boolean }) {
  const { columns, groups, total } = buildMatrix(report, country, weekly);
  const title = weekly ? "Weekly Meta ROAS" : "Daily Meta ROAS";
  const region = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const anchor = weekly ? columns.at(-1) : columns.findLast(c => !c.pending);
  const anchorDate = anchor?.from;
  useLayoutEffect(() => {
    const element = region.current;
    const target = element?.querySelector<HTMLElement>(`[data-day="${anchorDate}"]`);
    if (!element || !target) return;
    const align = () => { element.scrollLeft += target.getBoundingClientRect().right - element.getBoundingClientRect().left - element.clientWidth - element.clientLeft; };
    align();
    const observer = new ResizeObserver(align);
    observer.observe(element);
    const stop = () => observer.disconnect();
    for (const event of ["wheel", "touchstart", "keydown", "pointerdown"]) element.addEventListener(event, stop, { passive: true });
    return () => {
      stop();
      for (const event of ["wheel", "touchstart", "keydown", "pointerdown"]) element.removeEventListener(event, stop);
    };
  }, [anchorDate, country, groups.length]);

  const campaigns = groups.flatMap(group => group.campaigns);
  const periodHighs = columns.map((column, i) => column.pending ? null :
    Math.max(...campaigns.map(campaign => multiple(campaign.values[i]) ?? -Infinity)));

  function row(name: string, values: Amounts[], metric: keyof Amounts | "roas", options: { id?: string; level?: number; platform?: string; campaign?: boolean } = {}) {
    const { id, level = 0, platform } = options;
    const isRoas = metric === "roas";
    const open = !!id && expanded.has(id);
    return <tr key={id ?? name} className={isRoas ? "font-semibold" : "text-muted-foreground"}>
      <th scope="row" className={`${sticky} ${isRoas ? "font-semibold" : "font-normal"}`} style={{ paddingInlineStart: 12 + 16 * level }}>
        {id ? <button type="button" aria-expanded={open} title={name} className="flex w-full cursor-pointer items-center gap-1.5 text-left hover:text-foreground"
          onClick={() => setExpanded(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; })}>
          <ChevronRight aria-hidden className={`size-3 shrink-0 ${open ? "rotate-90" : ""}`} /><span className="truncate">{name}</span>
        </button> : name}
      </th>
      {values.map((v, i) => {
        const col = columns[i], prior = columns[i - 1];
        const value = isRoas ? multiple(v) : v[metric];
        const shown = value == null ? null : Number(value.toFixed(2));
        const belowTarget = isRoas && !col.pending && shown != null && shown < 1.5;
        const periodWinner = options.campaign && value != null && value === periodHighs[i];
        const previous = i ? multiple(values[i - 1]) : null;
        const delta = weekly && isRoas && prior && !col.pending && !prior.pending && !overlapsGap(col, platform) && !overlapsGap(prior, platform)
          && previous != null && previous > 0 && value != null ? Number(((value / previous - 1) * 100).toFixed(1)) : null;
        return <td key={col.from} title={periodWinner ? `Highest campaign ROAS for this ${weekly ? "week" : "day"}` : undefined}
          className={cn(cell, (periodWinner || belowTarget) && "text-analytics-highlight", periodWinner && "bg-analytics-highlight-bg")} style={col.pending ? { backgroundImage: hatching } : undefined}>{delta != null && <span className="mr-2 text-[10px] font-medium text-muted-foreground">{delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} {Math.abs(delta)}%</span>}
          {value == null ? "—" : isRoas ? value.toFixed(2) + "×" : dollars.format(value)}</td>;
      })}
    </tr>;
  }
  return <DashboardCard title={title} contentClassName="pt-0">
    {!groups.length ? <p role="status" className="py-4 text-sm text-muted-foreground">{report.tablesAvailable ? "No campaign spend in this market during the last 21 days." : "Meta ROAS could not be loaded."}</p> :
      <div ref={region} className="min-w-0 overflow-x-auto scrollbar-none rounded-xl border border-foreground/[0.06]" role="region" aria-label={title} tabIndex={0}>
        <table className="w-full border-separate border-spacing-0 text-xs"><thead><tr className="bg-analytics-subtle">
          <th scope="col" className={`${sticky} z-20 border-t-0 bg-analytics-subtle font-medium`}>Country / campaign</th>
          {columns.map(c => <th scope="col" key={c.from} data-day={c.from} style={{ backgroundImage: c.pending ? hatching : undefined }}
            className={`${cell} ${weekly ? "min-w-32" : "min-w-24"} border-t-0 py-3 font-medium text-muted-foreground`}>
            {label(c.from)}{weekly && " – " + label(c.to)}{weekly && (c.pending || overlapsGap(c)) && <span className="block text-[10px]">{c.pending ? "Unfinished" : "Attribution gap"}</span>}
          </th>)}
        </tr></thead><tbody>
          {row("Total spend", total, "spend")}{row("Total proceeds", total, "proceeds")}{row("Total blended ROAS", total, "roas")}
          {groups.map(g => <Fragment key={g.code}>
            {row(`${countryFlag(g.code)} ${marketCountryLabel(g.code)} · Blended ROAS`, g.values, "roas", { id: g.code })}
            {expanded.has(g.code) && <>{row("Total spend", g.values, "spend", { level: 1 })}{row("Total proceeds", g.values, "proceeds", { level: 1 })}{row("Organic proceeds", g.values, "organic", { level: 1 })}</>}
            {g.campaigns.map(c => <Fragment key={c.id}>
              {row(c.label.replace(/^[A-Z]{2}(?= - )/, countryFlag(g.code)), c.values, "roas", { id: c.id, level: 1, platform: c.platform, campaign: true })}
              {expanded.has(c.id) && <>{row("Spend", c.values, "spend", { level: 2 })}{row("Attributed proceeds", c.values, "proceeds", { level: 2 })}</>}
            </Fragment>)}
          </Fragment>)}
        </tbody></table>
      </div>}
  </DashboardCard>;
}

export function VersyMetaRoasTables({ report, country = "all" }: { report: Report; country?: string }) {
  return <div className="min-w-0 space-y-4">
    <VersyBlendedRoasChart trend={report.trend[country] ?? []} />
    <Matrix report={report} country={country} weekly={false} /><Matrix report={report} country={country} weekly />
  </div>;
}
