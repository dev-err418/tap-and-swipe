"use client";

import { use, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { DashboardCard } from "./DashboardCard";
import { VERSY_META_MARKETS, totalRoas, type VersyRoasReport } from "@/lib/versy-meta-roas";

const hatching: CSSProperties = { backgroundImage: "repeating-linear-gradient(125deg, transparent, transparent 12px, color-mix(in srgb, var(--foreground) 9%, transparent) 12px, color-mix(in srgb, var(--foreground) 9%, transparent) 13px)" };
const money = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
const ratio = (value: number | null | undefined) => value == null ? "—" : `${value.toFixed(2)}×`;
const label = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export default function DeferredVersyMetaRoas({ report, country }: { report: Promise<VersyRoasReport>; country: string }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    const timer = window.setInterval(refresh, 5 * 60_000 + 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [router]);
  return <VersyMetaRoasTables report={use(report)} country={country} />;
}

export function VersyMetaRoasTables({ report, country = "all" }: { report: VersyRoasReport; country?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [checkedAt, setCheckedAt] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setCheckedAt(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const days = report.days;
  const initialRightDate = days.at(-9)?.date;
  useLayoutEffect(() => {
    if (!initialRightDate) return;
    const cleanups: (() => void)[] = [];
    for (const region of root.current?.querySelectorAll<HTMLElement>("[data-roas-scroll]") ?? []) {
      const cell = region.querySelector<HTMLElement>(`[data-roas-date="${initialRightDate}"]`);
      if (!cell) continue;
      // Suspense/hydration and responsive layout can change widths after mount.
      // Keep the first mature day flush with the viewport's inner right edge.
      const align = () => {
        const right = region.getBoundingClientRect().left + region.clientLeft + region.clientWidth;
        region.scrollLeft = Math.max(0, region.scrollLeft + cell.getBoundingClientRect().right - right);
      };
      align();
      const observer = new ResizeObserver(align);
      observer.observe(region);
      const table = region.querySelector("table");
      if (table) observer.observe(table);
      // Once the user starts exploring, retain their chosen scroll position.
      const stop = () => observer.disconnect();
      region.addEventListener("wheel", stop, { passive: true });
      region.addEventListener("touchstart", stop, { passive: true });
      region.addEventListener("keydown", stop);
      cleanups.push(() => {
        observer.disconnect();
        region.removeEventListener("wheel", stop);
        region.removeEventListener("touchstart", stop);
        region.removeEventListener("keydown", stop);
      });
    }
    return () => cleanups.forEach((cleanup) => cleanup());
  }, [country, initialRightDate, report.status]);
  const markets = VERSY_META_MARKETS.filter((market) => country === "all" || market.code === country);
  const delayed = checkedAt - Date.parse(report.updatedAt) > 10 * 60_000;
  const refreshed = new Date(report.updatedAt).toLocaleString("en-GB", { timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return <div ref={root} className="min-w-0 space-y-4">
    {report.status === "ready" && <p role={delayed ? "status" : undefined} className="text-xs text-muted-foreground">
      {delayed ? "Update delayed — showing the last successful report. " : ""}Updated {refreshed} Paris · refreshes automatically every 5 minutes
    </p>}
    {markets.map((market) => {
      const rows: { key: string; title: string; metric: string; values: string[]; group: boolean }[] = market.campaigns.flatMap((campaign) => [
        { key: `${campaign.id}:spend`, title: campaign.name, metric: "Spend", values: days.map(({ date }) => money(report.campaigns[campaign.id]?.[date]?.spend)), group: true },
        { key: `${campaign.id}:proceeds`, title: campaign.name, metric: "Attributed proceeds", values: days.map(({ date }) => money(report.campaigns[campaign.id]?.[date]?.proceeds)), group: false },
        { key: `${campaign.id}:roas`, title: campaign.name, metric: "ROAS", values: days.map(({ date }) => ratio(report.campaigns[campaign.id]?.[date]?.roas)), group: false },
      ]);
      rows.push(
        { key: "organic:proceeds", title: "Organic", metric: "Proceeds", values: days.map(({ date }) => money(report.organic[market.code]?.[date]?.proceeds)), group: true },
        { key: "total", title: "Total ROAS", metric: "Meta + organic", values: days.map(({ date }) => ratio(totalRoas(report, market, date))), group: true },
      );
      return <DashboardCard key={market.code} title={`${market.flag} ${market.name} · Meta ROAS`} contentClassName="pt-0"
        action={<span className="text-xs text-muted-foreground">By install date · Last 30 days · USD · UTC</span>}>
        {report.status === "unavailable" ? <p role="status" className="py-4 text-sm text-muted-foreground">Meta ROAS could not be loaded. Refresh to retry.</p> : <>
          <div data-roas-scroll className="min-w-0 overflow-x-auto scrollbar-none rounded-xl border border-foreground/[0.06]" role="region" aria-label={`${market.name} daily Meta ROAS`} tabIndex={0}>
            <table className="w-full border-separate border-spacing-0 text-left text-xs">
              <caption className="sr-only">{market.name}: daily spend and lifetime proceeds grouped by install date. Hatched columns have installs with less than seven full days of observation.</caption>
              <thead><tr className="bg-analytics-subtle">
                <th scope="col" className="sticky left-0 z-20 min-w-72 bg-analytics-subtle px-4 py-3 font-medium">Campaign / metric</th>
                {days.map((day) => <th key={day.date} data-roas-date={day.date} scope="col" style={day.immature ? hatching : undefined}
                  title={day.immature ? "Not all installs have 7 full days of observation — trial proceeds are still maturing" : undefined}
                  className="min-w-24 whitespace-nowrap border-l border-foreground/[0.06] px-3 py-3 text-right font-medium text-muted-foreground">
                  {label(day.date)}{day.immature && <span className="sr-only"> · trials still maturing</span>}
                </th>)}
              </tr></thead>
              <tbody>{rows.map((row) => <tr key={row.key} className={row.key === "total" ? "font-semibold" : ""}>
                <th scope="row" className={`sticky left-0 z-10 bg-card px-4 py-2 text-left ${row.group ? "border-t border-foreground/15" : "border-t border-foreground/[0.06]"}`}>
                  {row.group && <div className="whitespace-nowrap font-medium">{row.title}</div>}
                  {!row.group && <span className="sr-only">{row.title}: </span>}
                  <span className="text-[11px] font-normal text-muted-foreground">{row.metric}</span>
                </th>
                {row.values.map((value, index) => <td key={days[index].date} style={days[index].immature ? hatching : undefined}
                  className={`border-l border-foreground/[0.06] px-3 py-2 text-right tabular-nums ${row.group ? "border-t border-t-foreground/15" : "border-t"}`}>{value}</td>)}
              </tr>)}</tbody>
            </table>
          </div>
        </>}
      </DashboardCard>;
    })}
  </div>;
}
