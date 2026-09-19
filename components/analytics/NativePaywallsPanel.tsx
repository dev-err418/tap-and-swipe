"use client";

import { useState } from "react";
import { PAYWALL_HORIZONS, type NativePaywallReport, type NativePaywallRow, type PaywallHorizon } from "@/lib/native-paywall-analytics";
import { DASHBOARD_SURFACE_CLASS, DASHBOARD_TAB_ACTIVE_CLASS, DASHBOARD_TAB_CLASS, DASHBOARD_TAB_INACTIVE_CLASS } from "./dashboard-surface";
import { cn } from "@/lib/utils";
import { NATIVE_PAYWALL_DEMO_REPORT } from "@/lib/native-paywall-demo";

const languages: Record<string, string> = { en: "English", es: "Spanish", de: "German" };
const languageFlags: Record<string, string> = { en: "🇬🇧", es: "🇪🇸", de: "🇩🇪" };
const currency = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percent = (n: number | null) => n == null ? "—" : `${(n * 100).toFixed(1)}%`;
const count = (n: number) => n.toLocaleString("en-US");

function conversionInterval(conversions: number, views: number) {
  if (views <= 0) return null;
  // Wilson score interval: stable for small samples and rates close to 0% or 100%.
  const z = 1.96;
  const rate = conversions / views;
  const denominator = 1 + z ** 2 / views;
  const center = (rate + z ** 2 / (2 * views)) / denominator;
  const margin = z * Math.sqrt(rate * (1 - rate) / views + z ** 2 / (4 * views ** 2)) / denominator;
  return { rate, lower: Math.max(0, center - margin), upper: Math.min(1, center + margin) };
}

type ConversionDomain = { minimum: number; maximum: number };

function makeConversionDomain(rows: NativePaywallRow[]): ConversionDomain {
  const intervals = rows.flatMap((row) => {
    const interval = conversionInterval(row.conversions, row.views);
    return interval ? [interval] : [];
  });
  if (!intervals.length) return { minimum: 0, maximum: 1 };
  const minimum = Math.min(...intervals.map((interval) => interval.lower));
  const maximum = Math.max(...intervals.map((interval) => interval.upper));
  if (maximum > minimum) return { minimum, maximum };
  return { minimum: Math.max(0, minimum - 0.005), maximum: Math.min(1, maximum + 0.005) };
}

export default function NativePaywallsPanel({ report: liveReport }: { report: NativePaywallReport | null }) {
  const [demo, setDemo] = useState(true);
  const report = demo ? NATIVE_PAYWALL_DEMO_REPORT : liveReport;
  const [language, setLanguage] = useState("en");
  const [experimentID, setExperimentID] = useState("");
  const [horizon, setHorizon] = useState<PaywallHorizon>(7);
  const experiments = report?.groups.filter((g) => g.language === "all") ?? [];
  const selected = experiments.find((g) => g.experiment === experimentID) ?? experiments[0];
  const availableLanguages = [...new Set(report?.groups.filter((g) => g.experiment === selected?.experiment && g.language !== "all").map((g) => g.language) ?? [])]
    .sort((a, b) => a === b ? 0 : a === "en" ? -1 : b === "en" ? 1 : 0);
  const selectedLanguage = availableLanguages.includes(language) ? language : availableLanguages[0];
  const group = report?.groups.find((g) => g.experiment === selected?.experiment && g.language === selectedLanguage);

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/70 px-5 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs font-semibold text-amber-900">{demo ? "Demo data" : "Live data"}</span>
        <span className="text-xs text-amber-800">{demo ? "Fictional numbers for UI preview. Date filters don’t apply; the main chart remains live." : "Showing real Superwall analytics only."}</span>
      </div>
      <button type="button" onClick={() => setDemo(!demo)} className="rounded-full border border-amber-300/70 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100">
        {demo ? "Show live data" : "Show demo data"}
      </button>
    </div>
    <div className={cn(DASHBOARD_SURFACE_CLASS, "space-y-4 p-5")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-sm font-semibold">Audiences</h2><p className="mt-1 text-xs text-muted-foreground">App language when the user joined the experiment</p></div>
        <div className="flex flex-wrap items-center gap-3">
          {experiments.length > 0 && <label className="text-xs text-muted-foreground">Experiment
            <select aria-label="Paywall experiment" value={selected?.experiment ?? ""} onChange={(e) => setExperimentID(e.target.value)} className="ml-2 rounded-full border border-black/10 bg-white px-3 py-2 text-foreground">
              {experiments.map((g) => <option key={g.experiment} value={g.experiment}>{g.name}</option>)}
            </select>
          </label>}
          <label className="text-xs text-muted-foreground">APPU window
            <select aria-label="APPU observation window" value={horizon} onChange={(e) => setHorizon(Number(e.target.value) as PaywallHorizon)} className="ml-2 rounded-full border border-black/10 bg-white px-3 py-2 text-foreground">
              {PAYWALL_HORIZONS.map((d) => <option key={d} value={d}>D{d}</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Language audience">
        {availableLanguages.map((code) => <button type="button" key={code} aria-pressed={code === selectedLanguage} onClick={() => setLanguage(code)} className={cn(DASHBOARD_TAB_CLASS, "h-8 px-3", code === selectedLanguage ? DASHBOARD_TAB_ACTIVE_CLASS : DASHBOARD_TAB_INACTIVE_CLASS)}><span aria-hidden="true" className="mr-1.5">{languageFlags[code] ?? "🌐"}</span>{languages[code] ?? code.toUpperCase()}</button>)}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{demo ? "Explore the sample audiences and observation windows. " : "The date filter selects when users joined. Proceeds follow those users through today. "}Estimated APPU uses only users with a full {horizon} days of observation, including those who never pay; it is not a lifetime forecast.</p>
      {report?.warnings.map((warning) => <p role="status" key={warning} className="text-xs text-amber-700">{warning}</p>)}
    </div>
    {report?.status === "unavailable" || !report ? <Empty>Paywall data could not be loaded. Refresh to retry.</Empty>
      : !group ? <Empty>No native paywall tracking yet for this cohort. Results will appear after users run the instrumented Glow release.</Empty>
      : <>
        <ResultsTable title="Paywalls" rows={group.paywalls} horizon={horizon} />
        <ResultsTable title="Placements" rows={group.placements} horizon={horizon} placement />
      </>}
  </div>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className={cn(DASHBOARD_SURFACE_CLASS, "flex min-h-48 items-center justify-center p-8 text-center text-sm text-muted-foreground")}>{children}</div>;
}

function ResultsTable({ title, rows, horizon, placement = false }: { title: string; rows: NativePaywallRow[]; horizon: PaywallHorizon; placement?: boolean }) {
  const sortedRows = [...rows].sort((a, b) => {
    const appuA = a.users ? a.proceeds / a.users : Number.NEGATIVE_INFINITY;
    const appuB = b.users ? b.proceeds / b.users : Number.NEGATIVE_INFINITY;
    return appuB - appuA || b.users - a.users;
  });
  const conversionDomain = makeConversionDomain(sortedRows);
  const columns = [
    ["APPU", "Net proceeds divided by every assigned user in this row."],
    ["Users", placement ? "Assigned users who reached this placement. A user may reach several placements." : "All users assigned to this variant, including non-viewers and non-payers."],
    ["Views", "Unique users who actually saw the native paywall; repeat openings count once."],
    ["Conversions", "Unique users with a verified purchase, including free trial starts. Restores and renewals are not new conversions."],
    ["Conv. rate", "Conversions divided by unique viewers. The bar is a 95% confidence interval for the true conversion rate, not a daily high/low range."],
    ["Proceeds", "Attributed proceeds after store fees/taxes and refunded proceeds, including renewals. USD."],
    [`Estimated APPU D${horizon}`, `Average net proceeds during the first ${horizon} days after assignment, using only mature users. Not a lifetime projection.`],
    ["Probability best", placement ? "Placements have different audiences and are not randomized." : `Approximate probability of the highest D${horizon} APPU. Requires all variants, 50 mature users and 5 paid users per variant.`],
    ["Refunds", "Refunded customer revenue in USD, attributed back to the original purchase."],
    ["Refund rate", "Refunded customer revenue divided by gross customer revenue before refunds; not divided by proceeds."],
  ];
  const columnWidth = (label: string) => {
    if (label === "Conv. rate") return "min-w-[260px]";
    if (label.startsWith("Estimated APPU")) return "min-w-[150px]";
    if (label === "Probability best") return "min-w-[130px]";
    return "min-w-24";
  };
  return <section className="space-y-2">
    <h3 className="px-1 text-sm font-semibold">{title}</h3>
    <div className={cn(DASHBOARD_SURFACE_CLASS, "overflow-hidden")}>
      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full min-w-[1380px] text-left text-xs">
          <thead><tr className="border-b border-black/[0.06] text-muted-foreground"><th className="min-w-[180px] px-5 py-3 font-medium">{placement ? "Placement" : "Paywall"}</th>{columns.map(([label, hint]) => <th key={label} className={cn(columnWidth(label), "px-3 py-3 text-right font-medium")}><abbr title={hint} className="cursor-help whitespace-nowrap no-underline">{label}</abbr></th>)}</tr></thead>
        <tbody>{sortedRows.map((row) => {
          const estimate = row.estimates[horizon];
          return <tr key={row.id} className="border-b border-black/[0.04] last:border-0">
            <td className="px-5 py-4"><div className="font-medium">{row.label}</div>{row.paywall && <div className="mt-1 text-[10px] text-muted-foreground">{row.paywall}</div>}</td>
            <Cell>{row.users ? currency(row.proceeds / row.users) : "—"}</Cell>
            <Cell>{count(row.users)}</Cell><Cell>{count(row.views)}</Cell>
            <Cell><span title={`${count(row.paid)} users have paid`}>{count(row.conversions)}</span></Cell>
            <ConversionRateCell conversions={row.conversions} views={row.views} domain={conversionDomain} />
            <Cell>{currency(row.proceeds)}</Cell>
            <Cell><div>{estimate.appu == null ? "—" : currency(estimate.appu)}</div><div className="mt-1 text-[10px] text-muted-foreground">{count(estimate.users)} mature users</div></Cell>
            <Cell><span title={placement ? "Placements are not randomly assigned." : estimate.reason ?? "Normal approximation using each user's net proceeds, including zeros and refunds."}>{percent(placement ? null : estimate.chanceBest)}</span></Cell>
            <Cell>{currency(row.refunds)}</Cell><Cell>{percent(row.grossRevenue > 0 ? row.refunds / row.grossRevenue : null)}</Cell>
          </tr>;
        })}</tbody>
        </table>
        {!rows.length && <p className="p-6 text-sm text-muted-foreground">No {title.toLowerCase()} recorded yet.</p>}
      </div>
      {!placement && sortedRows.some((r) => r.estimates[horizon].reason) && <p className="px-5 py-3 text-xs text-muted-foreground">{sortedRows.find((r) => r.estimates[horizon].reason)?.estimates[horizon].reason}</p>}
    </div>
  </section>;
}

function Cell({ children }: { children: React.ReactNode }) { return <td className="whitespace-nowrap px-3 py-4 text-right tabular-nums">{children}</td>; }

function ConversionRateCell({ conversions, views, domain }: { conversions: number; views: number; domain: ConversionDomain }) {
  const interval = conversionInterval(conversions, views);
  if (!interval) return <Cell>—</Cell>;

  const domainSize = domain.maximum - domain.minimum;
  // Map the shared lowest/highest bounds to the same rail endpoints for every visible row.
  const position = (value: number) => 2 + Math.max(0, Math.min(1, (value - domain.minimum) / domainSize)) * 96;
  const ratePosition = position(interval.rate);
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
        <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#1d4ed8] shadow-[0_0_0_2px_rgba(29,78,216,0.16)]" style={{ left: `${ratePosition}%` }} />
        <span role="tooltip" className="dashboard-tooltip-shadow pointer-events-none absolute bottom-full right-0 z-20 mb-2 hidden rounded-lg border border-[#1d4ed8]/15 bg-[#f7f7f7] px-3 py-2 text-xs font-semibold text-black group-hover:block group-focus:block">{range}</span>
      </div>
    </div>
  </td>;
}
