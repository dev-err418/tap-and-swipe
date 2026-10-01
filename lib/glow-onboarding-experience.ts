import { parsePaywallAttributes, type PaywallAttribute, type PaywallRevenue } from "./native-paywall-analytics";
import { observedSessionDays, sessionsPerUserDay } from "./experiment-session-rate";

export const GLOW_ONBOARDING_ID = "onboarding_mascot_v1";
export const GLOW_ONBOARDING_KEY = "goe1_onboarding_mascot_v1";
export const DAY_MS = 86_400_000;
type Variant = "current" | "mascot_free";
type RecordValue = {
  schema: 1; experiment: string; allocation: "30_70"; environment: string;
  variant: Variant; language: string; randomized: boolean;
  assignedAt: number; updatedAt: number; completedAt?: number;
  days: Record<string, { sessions: number; active: true }>;
};
export type GlowOnboardingRow = {
  variant: Variant; label: string; users: number; completed: number; paid: number;
  sessions: number; sessionUserDays: number; sessionsPerUserDay: number | null;
  cancelledUsers: number; avgTimeToCancelMs: number | null;
  proceeds: number | null; arpu: number | null; proceedsVariance: number | null;
};
export type GlowOnboardingReport = {
  status: "ready" | "empty" | "unavailable"; asOf: number;
  rows: GlowOnboardingRow[]; warnings: string[];
};
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const timestamp = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

function parse(value: string, asOf: number): RecordValue | null {
  try {
    let r: unknown = JSON.parse(value);
    if (typeof r === "string") r = JSON.parse(r);
    if (!object(r) || r.schema !== 1 || r.experiment !== GLOW_ONBOARDING_ID || r.allocation !== "30_70"
      || !["current", "mascot_free"].includes(String(r.variant)) || typeof r.environment !== "string"
      || typeof r.language !== "string" || typeof r.randomized !== "boolean"
      || !timestamp(r.assignedAt) || !timestamp(r.updatedAt) || r.assignedAt > asOf
      || r.updatedAt < r.assignedAt || r.updatedAt > asOf || !object(r.days)
      || (r.completedAt !== undefined && (!timestamp(r.completedAt) || r.completedAt < r.assignedAt || r.completedAt > r.updatedAt))) return null;
    for (const [day, activity] of Object.entries(r.days)) {
      if (!/^(0|[1-9]|[12][0-9]|30)$/.test(day) || Number(day) > Math.floor((r.updatedAt - r.assignedAt) / DAY_MS)
        || !object(activity) || activity.active !== true || typeof activity.sessions !== "number"
        || !Number.isSafeInteger(activity.sessions) || activity.sessions < 0 || activity.sessions > 10000) return null;
    }
    if (!object(r.days["0"]) || Number(r.days["0"].sessions) < 1) return null;
    return r as RecordValue;
  } catch { return null; }
}

/** Validate immutable assignment before filtering its dates; never mix old copy cohorts. */
export function onboardingCohort(attributes: PaywallAttribute[], start: number, end: number, asOf: number) {
  const records = new Map<string, RecordValue>();
  const rejected = new Set<string>();
  for (const a of attributes) {
    if (a.key !== GLOW_ONBOARDING_KEY) continue;
    const r = parse(a.value, asOf);
    if (!r || !a.appUserId) { rejected.add(a.appUserId); continue; }
    const previous = records.get(a.appUserId);
    if (previous && JSON.stringify(previous) !== JSON.stringify(r)) { rejected.add(a.appUserId); continue; }
    records.set(a.appUserId, r);
  }
  for (const [id, r] of records) if (rejected.has(id) || r.environment !== "production" || !r.randomized
    || r.assignedAt < start || r.assignedAt >= end) records.delete(id);
  return { records, warnings: rejected.size ? [`${rejected.size} invalid or conflicting assignments were excluded. Review these records before comparing variants.`] : [] };
}

function time(value: string) {
  return Date.parse(/[zZ]$|[+-]\d\d:\d\d$/.test(value) ? value : value.replace(" ", "T") + "Z");
}

/** One observation per user: first subscription/trial start to its first cancellation.
 * Active subscriptions are censored, not zero-duration cancellations. Refunds are separate.
 */
function cancellationDurations(records: Map<string, RecordValue>, events: PaywallRevenue[], asOf: number) {
  const starts = new Map<string, { user: string; at: number }>();
  const cancellations = new Map<string, number>();
  let incomplete = false;
  for (const event of events) {
    const assignment = event.appUserId ? records.get(event.appUserId) : undefined;
    if (!assignment || !["initial_purchase", "cancellation"].includes(event.name)
      || Number(event.isRefund) === 1 || (event.price !== null && Number(event.price) < 0)) continue;
    const at = time(event.ts);
    if (!Number.isFinite(at)) { incomplete = true; continue; }
    if (at < assignment.assignedAt || at > asOf) continue;
    if (!event.originalTransactionId) { incomplete = true; continue; }
    const key = `${event.appUserId}|${event.originalTransactionId}`;
    if (event.name === "initial_purchase") {
      const previous = starts.get(key);
      if (!previous || at < previous.at) starts.set(key, { user: event.appUserId!, at });
    } else cancellations.set(key, Math.min(cancellations.get(key) ?? Infinity, at));
  }
  const firstByUser = new Map<string, { key: string; at: number }>();
  for (const [key, start] of starts) {
    if (start.at < (firstByUser.get(start.user)?.at ?? Infinity)) firstByUser.set(start.user, { key, at: start.at });
  }
  const durations = new Map<string, number>();
  for (const [user, first] of firstByUser) {
    const cancelledAt = cancellations.get(first.key);
    if (cancelledAt === undefined) continue;
    if (cancelledAt < first.at) { incomplete = true; continue; }
    durations.set(user, cancelledAt - first.at);
  }
  // A cancellation without its start may be a delayed server event. Do not silently
  // drop such users from the mean; wait for the matching start to arrive.
  for (const key of cancellations.keys()) if (!starts.has(key)) incomplete = true;
  return { durations, incomplete };
}

/** All post-assignment net proceeds / assigned users, regardless of paywall or payment. */
export function buildGlowOnboardingReport(attributes: PaywallAttribute[], events: PaywallRevenue[], start: number, end: number, asOf: number): GlowOnboardingReport {
  const { records, warnings } = onboardingCohort(attributes, start, end, asOf);
  const cancellation = cancellationDurations(records, events, asOf);
  if (cancellation.incomplete) warnings.push("Some cancellations are missing a valid matching subscription start. Average time to cancel is withheld until these events are complete.");
  const unique = new Map<string, PaywallRevenue>();
  let incompleteMoney = false;
  for (const e of events) {
    const assignment = e.appUserId ? records.get(e.appUserId) : undefined;
    if (!assignment) continue;
    const refund = Number(e.isRefund) === 1 || (e.price !== null && Number(e.price) < 0);
    if (!refund && !["initial_purchase", "renewal", "non_renewing_purchase"].includes(e.name)) continue;
    const at = time(e.ts);
    if (!Number.isFinite(at)) { incompleteMoney = true; continue; }
    if (at < assignment.assignedAt || at > asOf) continue;
    if (!e.transactionId || !e.originalTransactionId || !Number.isFinite(time(e.attributionTs))) {
      incompleteMoney = true; continue;
    }
    const key = `${e.originalTransactionId}|${e.transactionId}|${refund}`;
    const previous = unique.get(key);
    if (previous && previous.appUserId !== e.appUserId) { incompleteMoney = true; continue; }
    if (!previous || time(previous.attributionTs) < time(e.attributionTs)) unique.set(key, e);
  }
  const money = new Map<string, number>();
  const paid = new Set<string>();
  for (const e of unique.values()) {
    if (e.proceeds === null || e.price === null || !Number.isFinite(Number(e.proceeds)) || !Number.isFinite(Number(e.price))) {
      incompleteMoney = true; continue;
    }
    const refund = Number(e.isRefund) === 1 || Number(e.price) < 0;
    const amount = refund ? -Math.abs(Number(e.proceeds)) : Number(e.proceeds);
    if (!refund && amount > 0) paid.add(e.appUserId!);
    money.set(e.appUserId!, (money.get(e.appUserId!) ?? 0) + amount);
  }
  const purchaseAttributes = attributes.filter((a) => records.has(a.appUserId) && a.key.startsWith("gp1_t_"));
  const purchases = parsePaywallAttributes(purchaseAttributes);
  if (purchases.invalid > 0) incompleteMoney = true;
  // A verified purchase can reach attributes before server proceeds. Never report
  // a known payer as zero while the authoritative charge is still arriving.
  for (const { owner, purchase } of purchases.purchases) {
    if (purchase.purchasedAt < records.get(owner)!.assignedAt || purchase.purchasedAt > asOf) continue;
    const charge = unique.get(`${purchase.originalTransactionID}|${purchase.transactionID}|false`);
    if (!charge || charge.appUserId !== owner) incompleteMoney = true;
  }
  if (incompleteMoney) warnings.push("Some transaction amounts or identities are unavailable. ARPU is withheld until the revenue data is complete.");
  const rows = (["current", "mascot_free"] as const).map((variant): GlowOnboardingRow => {
    const users = [...records].filter(([, r]) => r.variant === variant);
    const sessions = users.reduce((sum, [, r]) => sum + Object.values(r.days).reduce((total, day) => total + day.sessions, 0), 0);
    // Same observed-person-day normalization as Poky. Activity is bounded to 31 elapsed days.
    const sessionUserDays = users.reduce((sum, [, r]) => sum + observedSessionDays(r.assignedAt, r.assignedAt, Math.min(asOf, r.assignedAt + 31 * DAY_MS)), 0);
    const values = users.map(([id]) => money.get(id) ?? 0);
    const total = values.reduce((sum, value) => sum + value, 0);
    const mean = users.length ? total / users.length : null;
    const cancelTimes = users.flatMap(([id]) => {
      const duration = cancellation.durations.get(id);
      return duration === undefined ? [] : [duration];
    });
    return { variant, label: variant === "current" ? "Current · 30%" : "No mascot · 70%", users: users.length,
      completed: users.filter(([, r]) => r.completedAt !== undefined).length,
      paid: users.filter(([id]) => paid.has(id)).length, sessions, sessionUserDays,
      cancelledUsers: cancelTimes.length,
      avgTimeToCancelMs: !cancellation.incomplete && cancelTimes.length ? cancelTimes.reduce((sum, value) => sum + value, 0) / cancelTimes.length : null,
      sessionsPerUserDay: sessionUserDays > 0 ? sessionsPerUserDay({ users: users.length, sessions, sessionUserDays }, 0) : null,
      proceeds: incompleteMoney ? null : total, arpu: incompleteMoney ? null : mean,
      proceedsVariance: !incompleteMoney && users.length > 1 ? values.reduce((sum, value) => sum + (value - mean!) ** 2, 0) / (users.length - 1) : null };
  });
  return { status: records.size ? "ready" : "empty", asOf, rows, warnings };
}
