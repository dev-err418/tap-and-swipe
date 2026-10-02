import { appAnalyticsTrendBucket, parisDatetimeLocalValue, parisDatetimeToDate } from "./app-analytics-time";
import { isMobileMoneyEvent } from "./mobile-app-money";
import { subscriptionActiveAt } from "./subscription-retention";

export type OverviewPeriod = "day" | "yesterday" | "3days" | "week" | "month" | "all";
export type CohortDay = 7 | 14 | 30;
export const COHORT_DAYS: readonly CohortDay[] = [7, 14, 30];
const DAY = 86_400_000;

export type OverviewCohortMetric = {
  eligibleInstalls: number;
  pendingInstalls: number;
  proceeds: number;
  missingMoney: number;
  eligibleSubscriptions: number;
  pendingSubscriptions: number;
  retainedSubscriptions: number;
};
export type OverviewAppuMetric = { installs: number; paid: number; proceeds: number; missingMoney: number };
export type OverviewCohortPoint = {
  date: string;
  installs: number;
  trackedInstalls: number;
  total: OverviewAppuMetric;
  languages: Record<string, OverviewAppuMetric>;
  checkpoints: Record<CohortDay, OverviewCohortMetric>;
};
export type AppOverviewCohorts = {
  available: boolean;
  period: OverviewPeriod;
  startMs: number;
  endMs: number;
  asOf: number;
  points: OverviewCohortPoint[];
  summary: Record<CohortDay, OverviewCohortMetric>;
  total: OverviewAppuMetric;
  languages: Record<string, OverviewAppuMetric>;
};
export type AppOverviewTrend = Pick<AppOverviewCohorts, "available" | "period" | "startMs" | "endMs" | "asOf" | "total"> & {
  points: Pick<OverviewCohortPoint, "date" | "installs" | "trackedInstalls" | "total">[];
};
type Install = { appUserId: string; installedAt: number; language?: string };
type Outcome = {
  appUserId: string;
  originalTransactionId: string;
  transactionId: string;
  name: string;
  isRefund: boolean;
  netProceeds: number | null;
  eventTs: number;
  attributionTs: number;
  expiresAt: number;
};

function emptyMetric(): OverviewCohortMetric {
  return { eligibleInstalls: 0, pendingInstalls: 0, proceeds: 0, missingMoney: 0,
    eligibleSubscriptions: 0, pendingSubscriptions: 0, retainedSubscriptions: 0 };
}
function emptyCheckpoints(): Record<CohortDay, OverviewCohortMetric> {
  return { 7: emptyMetric(), 14: emptyMetric(), 30: emptyMetric() };
}

function emptyAppuMetric(): OverviewAppuMetric {
  return { installs: 0, paid: 0, proceeds: 0, missingMoney: 0 };
}

function installLanguage(install: Install): string {
  const code = (install.language ?? "").trim().toLowerCase().split(/[-_]/)[0];
  return /^[a-z]{2,3}$/.test(code) ? code : "unknown";
}

export function overviewLanguageLabel(code: string): string {
  if (code === "all") return "All languages";
  if (code === "unknown") return "Unknown language";
  return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code.toUpperCase();
}

/** Language views count tracked installs; aggregate first_seen has no language breakdown. */
export function overviewForLanguage(report: AppOverviewCohorts, language: string): AppOverviewTrend {
  if (language === "all") return report;
  return {
    available: report.available, period: report.period, startMs: report.startMs, endMs: report.endMs, asOf: report.asOf,
    total: report.languages[language] ?? emptyAppuMetric(),
    points: report.points.map((point) => {
      const total = point.languages[language] ?? emptyAppuMetric();
      return { date: point.date, installs: total.installs, trackedInstalls: total.installs, total };
    }),
  };
}

/** Match the acquisition trend: hourly through 3 days, four-hour weekly, daily beyond. */
export function overviewBucketHours(period: OverviewPeriod): number {
  return period === "day" || period === "yesterday" || period === "3days" ? 1
    : period === "week" ? 4 : 24;
}

export function overviewBucket(date: Date, period: OverviewPeriod): Date {
  return appAnalyticsTrendBucket(date, period);
}

function nextBucket(date: Date, period: OverviewPeriod): Date {
  const step = overviewBucketHours(period) * 3_600_000;
  // Advance elapsed hours so both repeated autumn hours remain distinct and
  // the nonexistent spring hour is skipped. Larger buckets follow Paris wall time.
  if (overviewBucketHours(period) === 1) return new Date(date.getTime() + step);
  const wall = Date.parse(`${parisDatetimeLocalValue(date)}:00Z`);
  return parisDatetimeToDate(new Date(wall + step).toISOString().slice(0, 16));
}

/** A day's APPU is summed proceeds / summed tracked installs, never an average of bucket rates. */
export function overviewDailyPoints(report: AppOverviewTrend) {
  const days = new Map<number, OverviewAppuMetric>();
  for (const point of report.points) {
    const day = overviewBucket(new Date(point.date), "month").getTime();
    const total = days.get(day) ?? emptyAppuMetric();
    total.installs += point.total.installs;
    total.paid += point.total.paid;
    total.proceeds += point.total.proceeds;
    total.missingMoney += point.total.missingMoney;
    days.set(day, total);
  }
  return report.points.map((point) => {
    const dayStart = overviewBucket(new Date(point.date), "month");
    const dailyTotal = days.get(dayStart.getTime())!;
    return { ...point, dailyTotal,
      dayStartMs: dayStart.getTime(), dayEndMs: nextBucket(dayStart, "month").getTime(),
      appu: report.available ? totalCohortAppu(dailyTotal) : null };
  });
}

/** Install-date cohorts with fixed-age money and subscription-start retention.
 * No older installs are borrowed to populate a recent-only period. The loader
 * supplies production server events; failed queries remain unavailable.
 */
export function buildAppOverviewCohorts({ period, startMs, endMs, installs, events, downloads, available = true, asOf = Date.now() }: {
  period: OverviewPeriod;
  startMs: number;
  endMs: number;
  installs: Install[];
  events: Outcome[];
  downloads: { bucket: Date; downloads: number }[];
  available?: boolean;
  asOf?: number;
}): AppOverviewCohorts {
  const points = new Map<number, OverviewCohortPoint>();
  const pointAt = (timestamp: number) => {
    const bucket = overviewBucket(new Date(timestamp), period);
    const key = bucket.getTime();
    let point = points.get(key);
    if (!point) {
      point = { date: bucket.toISOString(), installs: 0, trackedInstalls: 0,
        total: emptyAppuMetric(), languages: {}, checkpoints: emptyCheckpoints() };
      points.set(key, point);
    }
    return point;
  };
  for (let bucket = overviewBucket(new Date(startMs), period); bucket.getTime() < endMs; bucket = nextBucket(bucket, period)) {
    pointAt(bucket.getTime());
  }
  for (const row of downloads) pointAt(row.bucket.getTime()).installs += row.downloads;

  const firstInstalls = new Map<string, Install>();
  for (const row of installs) {
    if (!row.appUserId || !Number.isFinite(row.installedAt)) continue;
    const previous = firstInstalls.get(row.appUserId);
    if (!previous || row.installedAt < previous.installedAt) firstInstalls.set(row.appUserId, row);
  }
  const selected = new Map([...firstInstalls].filter(([, row]) =>
    row.installedAt >= startMs && row.installedAt < endMs && row.installedAt <= asOf));
  for (const install of selected.values()) {
    const point = pointAt(install.installedAt);
    point.trackedInstalls++;
    point.total.installs++;
    const language = installLanguage(install);
    (point.languages[language] ??= emptyAppuMetric()).installs++;
    for (const days of COHORT_DAYS) {
      const key = install.installedAt + days * DAY <= asOf ? "eligibleInstalls" : "pendingInstalls";
      point.checkpoints[days][key]++;
    }
  }

  const observed = events.filter((event) => Number.isFinite(event.eventTs) && event.eventTs <= asOf);
  // A later renewal/refund can omit identity. Follow only a known initial
  // subscription owner, never infer identity from country or product.
  const owners = new Map<string, { user: string; startedAt: number }>();
  for (const event of observed) {
    if (event.name !== "initial_purchase" || event.isRefund || !event.originalTransactionId || !event.appUserId) continue;
    const previous = owners.get(event.originalTransactionId);
    if (!previous || event.eventTs < previous.startedAt) {
      owners.set(event.originalTransactionId, { user: event.appUserId, startedAt: event.eventTs });
    }
  }
  const money = new Map<string, Outcome>();
  const subscriptions = new Map<string, { install: Install; startedAt: number; events: Outcome[] }>();
  for (const event of observed) {
    const owner = owners.get(event.originalTransactionId);
    const install = selected.get(owner?.user ?? event.appUserId);
    if (!install || event.eventTs < install.installedAt || (owner && owner.startedAt < install.installedAt)) continue;
    if (owner && owner.startedAt >= install.installedAt
      && (["initial_purchase", "renewal", "cancellation"].includes(event.name) || event.isRefund)) {
      const subscription = subscriptions.get(event.originalTransactionId)
        ?? { install, startedAt: owner.startedAt, events: [] };
      subscription.events.push(event);
      subscriptions.set(event.originalTransactionId, subscription);
    }
    if (!isMobileMoneyEvent(event) && !event.isRefund) continue;
    const key = `${event.originalTransactionId || event.appUserId}|${event.transactionId || event.eventTs}|${event.isRefund ? "refund" : "charge"}`;
    const previous = money.get(key);
    if (!previous || event.attributionTs > previous.attributionTs) money.set(key, event);
  }
  const paidUsers = new Set<string>();
  for (const event of money.values()) {
    const install = selected.get(owners.get(event.originalTransactionId)?.user ?? event.appUserId)!;
    const point = pointAt(install.installedAt);
    const languageMetric = point.languages[installLanguage(install)];
    // Conversion is ever-paid users, not transactions or currently active subscribers.
    // Refunds do not undo a past conversion, and free trials are not paid conversions.
    if (!event.isRefund && event.netProceeds != null && Number.isFinite(event.netProceeds)
      && event.netProceeds > 0 && isMobileMoneyEvent(event) && !paidUsers.has(install.appUserId)) {
      paidUsers.add(install.appUserId);
      point.total.paid++;
      languageMetric.paid++;
    }
    for (const metric of [point.total, languageMetric]) {
      if (event.netProceeds == null || !Number.isFinite(event.netProceeds)) metric.missingMoney++;
      else metric.proceeds += event.isRefund ? -Math.abs(event.netProceeds) : event.netProceeds;
    }
    for (const days of COHORT_DAYS) {
      const checkpoint = install.installedAt + days * DAY;
      if (checkpoint > asOf || event.eventTs > checkpoint) continue;
      if (event.netProceeds == null || !Number.isFinite(event.netProceeds)) point.checkpoints[days].missingMoney++;
      else point.checkpoints[days].proceeds += event.isRefund ? -Math.abs(event.netProceeds) : event.netProceeds;
    }
  }
  for (const subscription of subscriptions.values()) {
    const point = pointAt(subscription.install.installedAt);
    for (const days of COHORT_DAYS) {
      const metric = point.checkpoints[days];
      const checkpoint = subscription.startedAt + days * DAY;
      if (checkpoint > asOf) { metric.pendingSubscriptions++; continue; }
      metric.eligibleSubscriptions++;
      if (subscriptionActiveAt(subscription.events, checkpoint)) metric.retainedSubscriptions++;
    }
  }
  const summary = emptyCheckpoints();
  const total = emptyAppuMetric();
  const languages: Record<string, OverviewAppuMetric> = {};
  const sorted = [...points.values()].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  for (const point of sorted) {
    total.installs += point.total.installs;
    total.paid += point.total.paid;
    total.proceeds += point.total.proceeds;
    total.missingMoney += point.total.missingMoney;
    for (const [language, metric] of Object.entries(point.languages)) {
      const languageTotal = languages[language] ??= emptyAppuMetric();
      languageTotal.installs += metric.installs;
      languageTotal.paid += metric.paid;
      languageTotal.proceeds += metric.proceeds;
      languageTotal.missingMoney += metric.missingMoney;
      metric.proceeds = Math.round(metric.proceeds * 100) / 100;
    }
    point.total.proceeds = Math.round(point.total.proceeds * 100) / 100;
    for (const days of COHORT_DAYS) {
      const metric = point.checkpoints[days];
      for (const key of Object.keys(metric) as (keyof OverviewCohortMetric)[]) summary[days][key] += metric[key];
      metric.proceeds = Math.round(metric.proceeds * 100) / 100;
    }
  }
  for (const days of COHORT_DAYS) summary[days].proceeds = Math.round(summary[days].proceeds * 100) / 100;
  total.proceeds = Math.round(total.proceeds * 100) / 100;
  for (const metric of Object.values(languages)) metric.proceeds = Math.round(metric.proceeds * 100) / 100;
  return { available, period, startMs, endMs, asOf, points: sorted, summary, total, languages };
}

/** All linked proceeds through report time / tracked installs, including non-payers. */
export function totalCohortAppu(metric: OverviewAppuMetric): number | null {
  return metric.installs > 0 && metric.missingMoney === 0 ? metric.proceeds / metric.installs : null;
}

export function cohortAppu(metric: OverviewCohortMetric): number | null {
  return metric.eligibleInstalls > 0 && metric.missingMoney === 0 ? metric.proceeds / metric.eligibleInstalls : null;
}
export function cohortSubscriptionRetention(metric: OverviewCohortMetric): number | null {
  return metric.eligibleSubscriptions > 0 ? metric.retainedSubscriptions / metric.eligibleSubscriptions : null;
}
