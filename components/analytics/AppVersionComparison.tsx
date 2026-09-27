"use client";

import type { MobileAppExperiment, MobileAppExperimentVariant, MobileAppVersionComparison } from "@/lib/mobile-app-analytics";
import type { NativePaywallGroup, NativePaywallRow } from "@/lib/native-paywall-analytics";
import type { UserJourneyVariantResult } from "@/lib/user-journey";
import type { JournalPracticeReport } from "@/lib/journal-practice-analytics";
import type { WinbackPaywallReport, WinbackPaywallRow } from "@/lib/winback-paywall-analytics";
import { sessionsPerUserDay } from "@/lib/experiment-session-rate";
import { DASHBOARD_SURFACE_CLASS } from "./dashboard-surface";
import { cn } from "@/lib/utils";

type Value = { number: number | null; kind: "count" | "money" | "rate" | "decimal" };
type Row = { label: string; before: Value; after: Value };
const count = (n: number) => n.toLocaleString("en-US");
const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rate = (n: number) => `${(n * 100).toFixed(1)}%`;
const ratio = (numerator: number, denominator: number) => denominator > 0 ? numerator / denominator : null;
const value = (number: number | null, kind: Value["kind"]): Value => ({ number, kind });

function display(item: Value) {
  return item.number == null ? "—" : item.kind === "rate" ? rate(item.number) : item.kind === "money" ? money(item.number) : item.kind === "decimal" ? item.number.toFixed(2) : count(item.number);
}

function difference(before: Value, after: Value) {
  if (before.number == null || after.number == null) return "—";
  const delta = after.number - before.number;
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  const absolute = Math.abs(delta);
  if (before.kind === "rate") return `${sign}${(absolute * 100).toFixed(1)} pp`;
  if (before.kind === "decimal") return `${sign}${absolute.toFixed(2)}`;
  return `${sign}${before.kind === "money" ? money(absolute) : count(absolute)}`;
}

function ComparisonTable({ title, rows, note, scrollLimit = false }: { title: string; rows: Row[]; note?: string; scrollLimit?: boolean }) {
  return <section className={cn(DASHBOARD_SURFACE_CLASS, "min-w-0 overflow-hidden")}>
    <div className="border-b border-black/[0.07] px-5 py-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
    </div>
    <div className={cn("overflow-x-auto", scrollLimit && "max-h-[32rem] overflow-y-auto")}>
      <table className="w-full min-w-[600px] text-xs">
        <thead className="sticky top-0 z-10 bg-white"><tr className="border-b border-black/[0.07] text-muted-foreground">
          <th className="px-5 py-3 text-left font-medium">Metric</th>
          <th className="px-3 py-3 text-right font-medium">Before</th>
          <th className="px-3 py-3 text-right font-medium">After</th>
          <th className="px-5 py-3 text-right font-medium">Difference</th>
        </tr></thead>
        <tbody>{rows.map((row) => <tr key={row.label} className="border-b border-black/[0.05] last:border-0">
          <th scope="row" className="px-5 py-3 text-left font-medium">{row.label}</th>
          <td className="px-3 py-3 text-right tabular-nums">{display(row.before)}</td>
          <td className="px-3 py-3 text-right tabular-nums">{display(row.after)}</td>
          <td className="px-5 py-3 text-right font-semibold tabular-nums">{difference(row.before, row.after)}</td>
        </tr>)}</tbody>
      </table>
      {!rows.length ? <p className="p-5 text-sm text-muted-foreground">No comparable records in this window.</p> : null}
    </div>
  </section>;
}

export function VersionDataComparison({ comparison, windowLabel }: { comparison: MobileAppVersionComparison; windowLabel: string }) {
  const a = comparison.before;
  const b = comparison.after;
  const rows: Row[] = [
    { label: "Tracked installs", before: value(a.installs, "count"), after: value(b.installs, "count") },
    { label: "Eligible cohort installs", before: value(a.cohortInstalls, "count"), after: value(b.cohortInstalls, "count") },
    { label: "Cohort paid users", before: value(a.cohortPaid, "count"), after: value(b.cohortPaid, "count") },
    { label: "Cohort proceeds", before: value(a.cohortProceeds, "money"), after: value(b.cohortProceeds, "money") },
    { label: "Cohort APPU", before: value(ratio(a.cohortProceeds, a.cohortInstalls), "money"), after: value(ratio(b.cohortProceeds, b.cohortInstalls), "money") },
    { label: "Install → paid", before: value(ratio(a.cohortPaid, a.cohortInstalls), "rate"), after: value(ratio(b.cohortPaid, b.cohortInstalls), "rate") },
  ];
  const journey = comparison.userJourney;
  const journeyRows: Row[] = [];
  if (journey) {
    const variants = new Map(journey.before.variants.map((item) => [item.key, item]));
    const afterVariants = new Map(journey.after.variants.map((item) => [item.key, item]));
    for (const key of new Set([...variants.keys(), ...afterVariants.keys()])) {
      const before = variants.get(key);
      const after = afterVariants.get(key);
      const label = after?.label ?? before?.label ?? key;
      journeyRows.push({ label: `${label} · assigned`, before: value(before?.assigned ?? 0, "count"), after: value(after?.assigned ?? 0, "count") });
      for (const step of after?.steps ?? before?.steps ?? []) {
        journeyRows.push({ label: `${label} · ${step.label}`, before: value(stepShare(before, step.attribute), "rate"), after: value(stepShare(after, step.attribute), "rate") });
      }
    }
  }
  const trialRows: Row[] = [];
  if (a.trialCancelTiming && b.trialCancelTiming) {
    const before = a.trialCancelTiming;
    const after = b.trialCancelTiming;
    trialRows.push(
      { label: "Trial starts", before: value(before.trials, "count"), after: value(after.trials, "count") },
      { label: "Still in trial at 15m", before: value(ratio(before.trials - before.cancelledBeforeQualified, before.trials), "rate"), after: value(ratio(after.trials - after.cancelledBeforeQualified, after.trials), "rate") },
      { label: "Still in trial at 3d", before: value(ratio(before.trials - before.cancelled, before.trials), "rate"), after: value(ratio(after.trials - after.cancelled, after.trials), "rate") },
    );
    let lostBefore = 0;
    let lostAfter = 0;
    for (const bucket of before.buckets) {
      lostBefore += bucket.cancels;
      lostAfter += after.buckets.find((row) => row.key === bucket.key)?.cancels ?? 0;
      trialRows.push({ label: `Survived ${bucket.label}`, before: value(ratio(before.trials - lostBefore, before.trials), "rate"), after: value(ratio(after.trials - lostAfter, after.trials), "rate") });
    }
  }
  const beforeCountries = new Map(a.countries.map((row) => [row.country, row]));
  const afterCountries = new Map(b.countries.map((row) => [row.country, row]));
  const countryRows: Row[] = [];
  const topCountries = [...new Set([...beforeCountries.keys(), ...afterCountries.keys()])]
    .sort((left, right) => (beforeCountries.get(right)?.installs ?? 0) + (afterCountries.get(right)?.installs ?? 0)
      - (beforeCountries.get(left)?.installs ?? 0) - (afterCountries.get(left)?.installs ?? 0))
    .slice(0, 10);
  for (const country of topCountries) {
    const first = beforeCountries.get(country);
    const second = afterCountries.get(country);
    const label = country === "unknown" ? "Unknown country" : new Intl.DisplayNames(["en"], { type: "region" }).of(country) ?? country;
    countryRows.push(
      { label: `${label} · installs`, before: value(first?.installs ?? 0, "count"), after: value(second?.installs ?? 0, "count") },
      { label: `${label} · APPU`, before: value(ratio(first?.proceeds ?? 0, first?.installs ?? 0), "money"), after: value(ratio(second?.proceeds ?? 0, second?.installs ?? 0), "money") },
      { label: `${label} · install → paid`, before: value(ratio(first?.paid ?? 0, first?.installs ?? 0), "rate"), after: value(ratio(second?.paid ?? 0, second?.installs ?? 0), "rate") },
    );
  }
  const planTotals = (side: typeof a) => side.plans.reduce((total, row) => ({
    yearlySubs: total.yearlySubs + row.yearlySubs,
    weeklySubs: total.weeklySubs + row.weeklySubs,
    yearlyProceeds: total.yearlyProceeds + row.yearlyProceeds,
    weeklyProceeds: total.weeklyProceeds + row.weeklyProceeds,
  }), { yearlySubs: 0, weeklySubs: 0, yearlyProceeds: 0, weeklyProceeds: 0 });
  const firstPlans = planTotals(a);
  const secondPlans = planTotals(b);
  const planRows: Row[] = a.plans.length || b.plans.length ? [
    { label: "Yearly subscriptions", before: value(firstPlans.yearlySubs, "count"), after: value(secondPlans.yearlySubs, "count") },
    { label: "Weekly subscriptions", before: value(firstPlans.weeklySubs, "count"), after: value(secondPlans.weeklySubs, "count") },
    { label: "Yearly proceeds", before: value(firstPlans.yearlyProceeds, "money"), after: value(secondPlans.yearlyProceeds, "money") },
    { label: "Weekly proceeds", before: value(firstPlans.weeklyProceeds, "money"), after: value(secondPlans.weeklyProceeds, "money") },
  ] : [];
  const retentionRows: Row[] = [];
  for (const plan of ["overall", "yearly", "weekly"] as const) for (const day of ["d1", "d7", "d30"] as const) {
    const retentionRate = (side: typeof a) => {
      const eligible = side.retention.reduce((total, row) => total + row[plan][day].eligible, 0);
      const retained = side.retention.reduce((total, row) => total + row[plan][day].retained, 0);
      return ratio(retained, eligible);
    };
    if (a.retention.length || b.retention.length) retentionRows.push({
      label: `${plan === "overall" ? "All plans" : plan === "yearly" ? "Yearly" : "Weekly"} · ${day.toUpperCase()} subscribed`,
      before: value(retentionRate(a), "rate"), after: value(retentionRate(b), "rate"),
    });
  }
  return <div className="space-y-4">
    <ComparisonTable title="Overall results by first installed version" rows={rows} note={`Tracked installs ${windowLabel.toLowerCase()}; eligible cohort outcomes are followed through today. The summary chart above counts all first-seen installs, including users without a recorded install version. ${comparison.excludedInstalls ? `${count(comparison.excludedInstalls)} tracked installs with unknown versions are excluded.` : ""}`} />
    {journey ? <ComparisonTable title="User journey" rows={journeyRows} note="Each screen shows the share of assigned installs that reached it. Differences are percentage points." scrollLimit /> : null}
    {trialRows.length ? <ComparisonTable title="Trial survival" rows={trialRows} note="Rates use trial starts from the selected install cohort as the denominator." /> : null}
    {countryRows.length ? <ComparisonTable title="Top countries" rows={countryRows} note="Top 10 countries by eligible cohort installs across both sides. APPU and conversion use those installs." /> : null}
    {planRows.length ? <ComparisonTable title="Subscription plans" rows={planRows} /> : null}
    {retentionRows.length ? <ComparisonTable title="Subscription retention" rows={retentionRows} note="Each rate uses users eligible for that day window in its own cohort." /> : null}
  </div>;
}

function stepShare(variant: UserJourneyVariantResult | undefined, attribute: string) {
  return variant?.assigned ? variant.steps.find((step) => step.attribute === attribute)?.share ?? 0 : null;
}

export function VersionExperimentComparison({ comparison }: { comparison: MobileAppVersionComparison }) {
  const before = new Map(comparison.before.experiments.map((experiment) => [experiment.id, experiment]));
  const after = new Map(comparison.after.experiments.map((experiment) => [experiment.id, experiment]));
  return <div className="space-y-4">
    <p className="px-1 text-xs text-muted-foreground">Most A/B assignments use the last 30 days; historical comparison cards keep their documented baseline. Version cohorts are observational, so differences do not establish an A/B winner.</p>
    {[...new Set([...before.keys(), ...after.keys()])].map((id) => {
      const first = before.get(id);
      const second = after.get(id);
      const definition = second ?? first!;
      const rows = experimentRows(first, second);
      return <ComparisonTable key={id} title={definition.title} rows={rows} note="Each variant is compared with the same variant on the other side of the version cutoff." />;
    })}
    {comparison.journalPractice ? <ComparisonTable title="Journal VS Practice" rows={journalRows(comparison.journalPractice.before, comparison.journalPractice.after)} note="Return rates use only users old enough to complete each day window." /> : null}
  </div>;
}

function journalRows(before: JournalPracticeReport, after: JournalPracticeReport): Row[] {
  const a = new Map(before.rows.map((row) => [row.variant, row]));
  const b = new Map(after.rows.map((row) => [row.variant, row]));
  const rows: Row[] = [];
  for (const key of new Set([...a.keys(), ...b.keys()])) {
    const first = a.get(key);
    const second = b.get(key);
    const label = second?.label ?? first?.label ?? key;
    rows.push(
      { label: `${label} · assigned users`, before: value(first?.users ?? 0, "count"), after: value(second?.users ?? 0, "count") },
      { label: `${label} · D1 return`, before: value(first?.d1.rate ?? null, "rate"), after: value(second?.d1.rate ?? null, "rate") },
      { label: `${label} · D7 return`, before: value(first?.d7.rate ?? null, "rate"), after: value(second?.d7.rate ?? null, "rate") },
      { label: `${label} · sessions / user / day`, before: value(first?.sessionsPerUserDayD7 ?? null, "decimal"), after: value(second?.sessionsPerUserDayD7 ?? null, "decimal") },
    );
  }
  return rows;
}

function experimentRows(before: MobileAppExperiment | undefined, after: MobileAppExperiment | undefined): Row[] {
  const beforeVariants = new Map(before?.variants.map((row) => [row.key, row]) ?? []);
  const afterVariants = new Map(after?.variants.map((row) => [row.key, row]) ?? []);
  const definition = after ?? before!;
  const rows: Row[] = [];
  for (const key of new Set([...beforeVariants.keys(), ...afterVariants.keys()])) {
    const a = beforeVariants.get(key);
    const b = afterVariants.get(key);
    const label = b?.label ?? a?.label ?? key;
    const metric = (name: string, extract: (row: MobileAppExperimentVariant) => Value) => rows.push({
      label: `${label} · ${name}`, before: a ? extract(a) : value(null, "count"), after: b ? extract(b) : value(null, "count"),
    });
    metric(definition.showInstalls === false ? "users" : "installs", (row) => value(definition.showInstalls === false ? row.users : row.installs, "count"));
    if (definition.showPaid !== false) metric("paid users", (row) => value(row.paid, "count"));
    metric("proceeds", (row) => value(row.proceeds, "money"));
    metric("APPU", (row) => value(ratio(row.proceeds, definition.showInstalls === false ? row.users : row.installs), "money"));
    if (definition.showSessions) metric("sessions / subscribed day", (row) => value(sessionsPerUserDay(row, definition.sessionDays ?? 1), "decimal"));
    if (definition.showDownloadPaid !== false) metric("Install → paid", (row) => value(ratio(row.paid, row.installs), "rate"));
    if (definition.showTrials) {
      metric("Install → trial", (row) => value(ratio(row.trials, row.installs), "rate"));
      metric("Trial → paid", (row) => value(ratio(row.converted, row.trials), "rate"));
    }
    if (definition.showCompletion) metric("Onboarding completion", (row) => value(ratio(row.completed, row.installs), "rate"));
    if (definition.showRetention) for (const day of [7, 14, 30] as const) metric(`D${day} subscribed`, (row) => value(ratio(row[`retainedD${day}`], row[`eligibleD${day}`]), "rate"));
    if (definition.scoreMetrics?.includes("appu_d7")) metric("APPU D7", (row) => value(ratio(row.proceedsD7, row.installsD7), "money"));
    if (definition.scoreMetrics?.includes("appu_d14")) metric("APPU D14", (row) => value(ratio(row.proceedsD14, row.installsD14), "money"));
  }
  return rows;
}

export function VersionPaywallComparison({ comparison }: { comparison: MobileAppVersionComparison }) {
  const reports = comparison.nativePaywalls;
  if (!reports) return <p className={cn(DASHBOARD_SURFACE_CLASS, "p-5 text-sm text-muted-foreground")}>Version comparison is unavailable for this paywall source.</p>;
  if (reports.before.status !== "ready" || reports.after.status !== "ready") return <p className={cn(DASHBOARD_SURFACE_CLASS, "p-5 text-sm text-muted-foreground")}>Paywall version comparison could not be loaded.</p>;
  const before = new Map(reports.before.groups.filter((group) => group.language === "all").map((group) => [group.experiment, group]));
  const after = new Map(reports.after.groups.filter((group) => group.language === "all").map((group) => [group.experiment, group]));
  return <div className="space-y-4">
    <p className="px-1 text-xs text-muted-foreground">Paywall assignments from the last 30 days; later purchases, renewals, and refunds follow each cohort. {reports.excludedUsers ? `${count(reports.excludedUsers)} users without a known first version are excluded.` : ""}</p>
    {[...new Set([...before.keys(), ...after.keys()])].map((id) => {
      const a = before.get(id);
      const b = after.get(id);
      const group = b ?? a!;
      return <div key={id} className="space-y-4">
        <ComparisonTable title={`${group.name} · paywalls`} rows={paywallRows(a, b, "paywalls")} />
        <ComparisonTable title={`${group.name} · placements`} rows={paywallRows(a, b, "placements")} />
      </div>;
    })}
  </div>;
}

function paywallRows(before: NativePaywallGroup | undefined, after: NativePaywallGroup | undefined, section: "paywalls" | "placements"): Row[] {
  const a = new Map(before?.[section].map((row) => [row.id, row]) ?? []);
  const b = new Map(after?.[section].map((row) => [row.id, row]) ?? []);
  const rows: Row[] = [];
  const flow = section === "paywalls" && Boolean(before?.outcomeScope || after?.outcomeScope);
  for (const id of new Set([...a.keys(), ...b.keys()])) {
    const first = a.get(id);
    const second = b.get(id);
    const label = second?.label ?? first?.label ?? id;
    const metric = (name: string, extract: (row: NativePaywallRow) => Value) => rows.push({
      label: `${label} · ${name}`, before: first ? extract(first) : value(null, "count"), after: second ? extract(second) : value(null, "count"),
    });
    metric("users", (row) => value(row.users, "count"));
    metric("views", (row) => value(row.views, "count"));
    metric(flow ? "assigned → conversion" : "view → conversion", (row) => value(ratio(row.conversions, flow ? row.users : row.views), "rate"));
    metric("total APPU", (row) => value(ratio(row.proceeds, row.users), "money"));
    metric("proceeds", (row) => value(row.proceeds, "money"));
    metric("refunds", (row) => value(row.refunds, "money"));
  }
  return rows;
}

export function VersionWinbackComparison({ report }: { report: WinbackPaywallReport }) {
  const comparison = report.versionComparison;
  if (!comparison) return report.versionComparisonError
    ? <p className="text-sm text-muted-foreground">{report.versionComparisonError}</p> : null;
  const rows: Row[] = [
    { label: "Viewers", before: value(comparison.before.viewers, "count"), after: value(comparison.after.viewers, "count") },
    { label: "Purchasers", before: value(comparison.before.buyers, "count"), after: value(comparison.after.buyers, "count") },
    { label: "View → purchase", before: value(comparison.before.conversionRate, "rate"), after: value(comparison.after.conversionRate, "rate") },
  ];
  for (const [title, key] of [["Source", "sources"], ["Product", "products"]] as const) {
    const before = new Map(comparison.before[key].map((row) => [winbackRowKey(row, key), row]));
    const after = new Map(comparison.after[key].map((row) => [winbackRowKey(row, key), row]));
    for (const id of new Set([...before.keys(), ...after.keys()])) {
      const a = before.get(id);
      const b = after.get(id);
      rows.push({ label: `${title} ${id} · view → purchase`, before: value(a?.conversionRate ?? null, "rate"), after: value(b?.conversionRate ?? null, "rate") });
    }
  }
  return <ComparisonTable title="Win-back offer by first installed version" rows={rows} note={`Last 30 days. ${comparison.excludedUsers ? `${count(comparison.excludedUsers)} viewers with unknown first versions are excluded.` : ""}`} />;
}

function winbackRowKey(row: WinbackPaywallRow, key: "sources" | "products") {
  return key === "sources" ? row.source : row.productId;
}
