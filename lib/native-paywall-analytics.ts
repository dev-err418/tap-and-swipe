import { calculateExperimentReadiness, type ExperimentReadiness } from "./experiment-stats";

/** Native iOS gp1 scalar-JSON attribute contract. See docs/native-paywall-analytics.md. */
export type PaywallRecord = {
  schema: 1;
  environment: string;
  experiment: string;
  experimentName: string;
  variant: string;
  variantName: string;
  paywall: string;
  language: string;
  assignedAt: number;
  randomized: boolean;
  variantCount: number;
  expectedProduct: string;
  allowedProducts?: string[];
  viewedAt?: number;
  placement?: string;
  reachedAt?: number;
  displayedProduct?: string;
  hadFallback?: boolean;
};

export type PaywallPurchase = {
  context: PaywallRecord;
  productID: string;
  startedAt: number;
  transactionID: string;
  originalTransactionID: string;
  purchasedAt: number;
};

export type PaywallAttribute = { appUserId: string; key: string; value: string };
export type PaywallRevenue = {
  appUserId?: string | null;
  id: string;
  name: string;
  originalTransactionId: string;
  transactionId: string | null;
  isRefund: number | string;
  price: number | string | null;
  proceeds: number | string | null;
  ts: string;
  purchasedAt: string;
  attributionTs: string;
};

type Estimate = {
  users: number;
  appu: number | null;
  chanceBest: number | null;
  relativeDelta: number | null;
  credibleInterval: [number, number] | null;
  readiness: ExperimentReadiness | null;
  reason: string | null;
};
export type NativePaywallRow = {
  id: string;
  label: string;
  paywall: string;
  users: number;
  views: number;
  conversions: number;
  paid: number;
  proceeds: number;
  grossRevenue: number;
  refunds: number;
  estimate: Estimate;
};
export type NativePaywallGroup = {
  outcomeScope?: "recovery_flow" | "recovery_eligibility";
  experiment: string;
  name: string;
  language: string;
  paywalls: NativePaywallRow[];
  placements: NativePaywallRow[];
};
export type NativePaywallReport = {
  status: "ready" | "unavailable";
  asOf: number;
  groups: NativePaywallGroup[];
  warnings: string[];
};

const DAY = 86_400_000;
const identifier = /^[a-z0-9_]{1,100}$/;
const transactionID = /^\d{1,30}$/;
const timestamp = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;
const dateMs = (value: string) => Date.parse(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);

function decode(value: string): unknown {
  try { return JSON.parse(value); } catch { return null; }
}

function validRecord(value: unknown): value is PaywallRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as PaywallRecord;
  return r.schema === 1 && r.environment === "production"
    && [r.experiment, r.variant, r.paywall].every((v) => typeof v === "string" && identifier.test(v))
    && typeof r.experimentName === "string" && typeof r.variantName === "string"
    && typeof r.language === "string" && /^[a-z]{2,3}$/.test(r.language)
    && typeof r.expectedProduct === "string" && typeof r.randomized === "boolean"
    && (r.allowedProducts == null || (Array.isArray(r.allowedProducts) && r.allowedProducts.length > 0
      && r.allowedProducts.length <= 10 && r.allowedProducts.every((p) => typeof p === "string" && p.length > 0)
      && r.allowedProducts.includes(r.expectedProduct)))
    && Number.isInteger(r.variantCount) && r.variantCount >= 1 && r.variantCount <= 20
    && timestamp(r.assignedAt)
    && (r.viewedAt == null || (timestamp(r.viewedAt) && r.viewedAt >= r.assignedAt))
    && (r.placement == null || (typeof r.placement === "string" && identifier.test(r.placement) && timestamp(r.reachedAt)
      && r.reachedAt >= r.assignedAt && (r.viewedAt == null || r.viewedAt >= r.reachedAt)));
}

export function parsePaywallAttributes(attributes: PaywallAttribute[]) {
  const assignments = new Map<string, PaywallRecord>();
  const placements: { owner: string; record: PaywallRecord }[] = [];
  const purchases: { owner: string; purchase: PaywallPurchase }[] = [];
  let invalid = 0;
  for (const row of attributes) {
    const value = decode(row.value);
    // Sandbox/development data is deliberately ignored, not counted as broken telemetry.
    const env = (value as PaywallRecord | null)?.environment ?? (value as PaywallPurchase | null)?.context?.environment;
    if (env && env !== "production") continue;
    if (row.key.startsWith("gp1_t_")) {
      const p = value as PaywallPurchase | null;
      if (p && validRecord(p.context) && p.context.placement && timestamp(p.context.viewedAt)
        && typeof p.productID === "string" && timestamp(p.startedAt) && timestamp(p.purchasedAt)
        && p.startedAt >= p.context.viewedAt && p.purchasedAt >= p.startedAt
        && typeof p.transactionID === "string" && typeof p.originalTransactionID === "string"
        && transactionID.test(p.transactionID) && transactionID.test(p.originalTransactionID)
        && row.key === `gp1_t_${p.transactionID}`) purchases.push({ owner: row.appUserId, purchase: p });
      else invalid++;
    } else if (validRecord(value)) {
      if (row.key === `gp1_a_${value.experiment}` && !value.placement) {
        assignments.set(`${row.appUserId}|${value.experiment}`, value);
      } else if (value.placement && row.key === `gp1_p_${value.experiment}__${value.placement}`) {
        placements.push({ owner: row.appUserId, record: value });
      } else invalid++;
    } else invalid++;
  }
  return { assignments, placements, purchases, invalid };
}

type Person = { record: PaywallRecord; convertedAt: number | null; money: { at: number; proceeds: number; revenue: number; refund: number }[] };
type WorkingRow = { id: string; label: string; paywall: string; people: Map<string, Person> };
type WorkingGroup = { experiment: string; name: string; language: string; paywalls: Map<string, WorkingRow>; placements: Map<string, WorkingRow> };

export const isRecoveryExperiment = (experiment: string) => /^poky_native_recovery_v[12]_(en|es|de|fr)$/.test(experiment);

/** First assignment wins across language changes, before selecting a date cohort. */
export function firstRecoveryAssignments(assignments: Map<string, PaywallRecord>, asOf: number, version = 1) {
  const first = new Map<string, PaywallRecord>();
  for (const [key, record] of assignments) {
    if (!isRecoveryExperiment(record.experiment) || !record.experiment.startsWith(`poky_native_recovery_v${version}_`)
      || !["holdout", "recovery"].includes(record.variant) || record.assignedAt > asOf) continue;
    const owner = key.slice(0, key.lastIndexOf("|"));
    if ((first.get(owner)?.assignedAt ?? Infinity) > record.assignedAt) first.set(owner, record);
  }
  return first;
}

export function buildNativePaywallReport(attributes: PaywallAttribute[], revenue: PaywallRevenue[], start: number, end: number, asOf = Date.now()): NativePaywallReport {
  const parsed = parsePaywallAttributes(attributes);
  const recoveryAssignments = [1, 2].map((version) => firstRecoveryAssignments(parsed.assignments, asOf, version));
  const groups = new Map<string, WorkingGroup>();
  const inCohort = (r: PaywallRecord) => r.assignedAt >= start && r.assignedAt < end && r.assignedAt <= asOf;
  const groupFor = (r: PaywallRecord, language: string) => {
    const id = `${r.experiment}|${language}`;
    let group = groups.get(id);
    if (!group) {
      group = { experiment: r.experiment, name: isRecoveryExperiment(r.experiment)
        ? r.experiment.includes("_v2_") ? "Regular flow vs recovery · 50/50" : "Recovery after cancellation · legacy 50/50"
        : r.experimentName, language, paywalls: new Map(), placements: new Map() };
      groups.set(id, group);
    }
    return group;
  };
  const enroll = (owner: string, r: PaywallRecord, placement: boolean) => {
    if (!inCohort(r) || (placement && (r.reachedAt ?? Infinity) > asOf)) return;
    for (const language of ["all", r.language]) {
      const group = groupFor(r, language);
      const rows = placement ? group.placements : group.paywalls;
      const id = placement ? r.placement! : `${r.variant}|${r.paywall}`;
      let row = rows.get(id);
      if (!row) {
        row = { id, label: placement ? r.placement! : isRecoveryExperiment(r.experiment)
          ? r.variant === "holdout" ? "Regular flow" : "Regular flow + recovery"
          : r.variantName, paywall: placement ? "" : r.paywall, people: new Map() };
        rows.set(id, row);
      }
      row.people.set(owner, { record: r, convertedAt: null, money: [] });
    }
  };
  for (const [key, r] of parsed.assignments) {
    const owner = key.slice(0, key.lastIndexOf("|"));
    if (!isRecoveryExperiment(r.experiment) || recoveryAssignments.some((assignments) => assignments.get(owner) === r)) enroll(owner, r, false);
  }
  for (const { owner, record } of parsed.placements) {
    const assigned = parsed.assignments.get(`${owner}|${record.experiment}`);
    if (assigned && sameAssignment(assigned, record)) enroll(owner, record, true);
  }
  const peopleFor = (owner: string, context: PaywallRecord): Person[] => {
    if (!inCohort(context)) return [];
    const assigned = parsed.assignments.get(`${owner}|${context.experiment}`);
    if (!assigned || !sameAssignment(assigned, context)) return [];
    return ["all", context.language].flatMap((language) => {
      const group = groups.get(`${context.experiment}|${language}`);
      return [isRecoveryExperiment(context.experiment) ? undefined : group?.paywalls.get(`${context.variant}|${context.paywall}`)?.people.get(owner),
        group?.placements.get(context.placement ?? "")?.people.get(owner)].filter((p): p is Person => Boolean(p));
    });
  };
  const recoveryPeopleFor = (owner: string, at: number): Person[] => recoveryAssignments.flatMap((assignments) => {
    const r = assignments.get(owner);
    if (!r || !inCohort(r) || at < r.assignedAt || at > asOf) return [];
    return ["all", r.language].flatMap((language) => {
      const person = groups.get(`${r.experiment}|${language}`)?.paywalls.get(`${r.variant}|${r.paywall}`)?.people.get(owner);
      return person ? [person] : [];
    });
  });

  const anchors = new Map<string, { owner: string; purchase: PaywallPurchase }[]>();
  for (const item of parsed.purchases) {
    const p = item.purchase;
    if (p.purchasedAt > asOf) continue;
    const list = anchors.get(p.originalTransactionID) ?? [];
    list.push(item);
    anchors.set(p.originalTransactionID, list);
    for (const person of recoveryPeopleFor(item.owner, p.purchasedAt)) {
      person.convertedAt = Math.min(person.convertedAt ?? Infinity, p.purchasedAt);
      if (sameAssignment(person.record, p.context) && person.record.viewedAt == null) {
        person.record = { ...person.record, viewedAt: p.context.viewedAt };
      }
    }
    for (const person of peopleFor(item.owner, p.context)) {
      person.convertedAt = Math.min(person.convertedAt ?? Infinity, p.purchasedAt);
      // Attributes arrive independently; the immutable purchase context also proves a view.
      if (person.record.viewedAt == null) person.record = { ...person.record, viewedAt: p.context.viewedAt };
    }
  }
  for (const list of anchors.values()) list.sort((a, b) => b.purchase.purchasedAt - a.purchase.purchasedAt);

  // SDK completions are excluded by the loader. Deduplicate Apple deliveries across event names.
  const unique = new Map<string, PaywallRevenue>();
  for (const event of revenue) {
    const ts = dateMs(event.ts);
    if (!Number.isFinite(ts) || ts > asOf || !event.transactionId) continue;
    const refund = Number(event.isRefund) === 1 || Number(event.price) < 0;
    if (!refund && !["initial_purchase", "renewal", "non_renewing_purchase"].includes(event.name)) continue;
    const key = `${event.originalTransactionId}|${event.transactionId}|${refund}`;
    const previous = unique.get(key);
    if (!previous || dateMs(event.attributionTs) > dateMs(previous.attributionTs)) unique.set(key, event);
  }
  const receivedTransactions = new Set([...unique.values()].filter((e) => Number(e.isRefund) !== 1 && Number(e.price) >= 0).map((e) => `${e.originalTransactionId}|${e.transactionId}`));
  const awaitingMoney = parsed.purchases.filter(({ owner, purchase: p }) => (inCohort(p.context) || recoveryPeopleFor(owner, p.purchasedAt).length > 0) && p.purchasedAt <= asOf
    && !receivedTransactions.has(`${p.originalTransactionID}|${p.transactionID}`));
  let missingMoney = 0;
  for (const event of unique.values()) {
    const list = anchors.get(event.originalTransactionId);
    const targetTime = dateMs(event.purchasedAt);
    // A refund belongs to its charged transaction, not to a later resubscription/paywall.
    const item = list?.find(({ purchase }) => purchase.transactionID === event.transactionId)
      ?? list?.find(({ purchase }) => purchase.purchasedAt <= (Number.isFinite(targetTime) ? targetTime : dateMs(event.ts)));
    const flowPeople = recoveryPeopleFor(item?.owner ?? event.appUserId ?? "", dateMs(event.ts));
    const people = [...(item ? peopleFor(item.owner, item.purchase.context) : []), ...flowPeople];
    if (!people.length) continue;
    if (event.price == null || event.proceeds == null || !Number.isFinite(Number(event.price)) || !Number.isFinite(Number(event.proceeds))) {
      missingMoney++;
      continue;
    }
    const refund = Number(event.isRefund) === 1 || Number(event.price) < 0;
    const proceeds = refund ? -Math.abs(Number(event.proceeds)) : Number(event.proceeds);
    if (!refund && ["initial_purchase", "non_renewing_purchase"].includes(event.name)) {
      for (const person of flowPeople) person.convertedAt = Math.min(person.convertedAt ?? Infinity, dateMs(event.ts));
    }
    for (const person of people) person.money.push({ at: dateMs(event.ts), proceeds,
      revenue: refund ? 0 : Math.max(0, Number(event.price)), refund: refund ? Math.abs(Number(event.price)) : 0 });
  }

  const output: NativePaywallGroup[] = [];
  for (const group of groups.values()) {
    const paywalls = [...group.paywalls.values()].sort((a, b) => a.id.localeCompare(b.id));
    const rows = paywalls.map((row) => summarize(row, asOf, false));
    {
      const stats = paywalls.map((row) => totalMoments(row, asOf));
      const expected = Math.max(0, ...stats.map((s) => s.variantCount));
      const hardBlock = parsed.invalid > 0 ? "Some tracking records are invalid; winner estimates are unavailable."
        : missingMoney > 0 ? "Some transaction amounts are unavailable."
        : awaitingMoney.some(({ owner, purchase: p }) => (p.context.experiment === group.experiment && (group.language === "all" || p.context.language === group.language))
          || (isRecoveryExperiment(group.experiment) && recoveryPeopleFor(owner, p.purchasedAt).some((person) => person.record.experiment === group.experiment && (group.language === "all" || person.record.language === group.language)))) ? "Waiting for Apple server revenue to reconcile verified purchases."
        : rows.length < 2 || rows.length !== expected ? "Waiting for all variants."
        : stats.some((s) => s.confounded) ? "Includes existing assignments or a fallback offer; not a clean randomized cohort." : null;
      const sampleBlock = stats.some((s) => s.n < 20 || s.paid < 3)
        ? "Early estimate — needs 20 users and 3 paid users per variant for a more stable comparison." : null;
      const blocked = hardBlock ?? sampleBlock;
      // Show the estimate as soon as every randomized arm is present. The sample warning
      // communicates uncertainty; it should not remove the probability visualization.
      const probabilities = hardBlock ? null : probabilityBest(stats);
      const comparisons = hardBlock ? null : relativeAppuComparisons(stats);
      const firstAssignedAt = Math.min(...stats.flatMap((stat) => stat.firstAssignedAt == null ? [] : [stat.firstAssignedAt]));
      // These paywall tests have symmetric variants rather than a semantic control. Use
      // an arm with observed APPU as the planning reference instead of alphabetical order.
      const readinessOrder = stats.map((stat, index) => ({ stat, paywall: paywalls[index] }))
        .sort((a, b) => Number(b.stat.mean > 0) - Number(a.stat.mean > 0));
      const readiness = hardBlock ? null : calculateExperimentReadiness(
        readinessOrder.map(({ stat, paywall }) => ({
          key: paywall.id,
          label: paywall.label,
          exposures: stat.n,
          conversions: stat.paid,
          revenue: stat.mean * stat.n,
          variance: stat.variance,
        })),
        "revenue_per_visitor",
        {
          minimumDetectableEffect: 0.5,
          minimumSamplesPerVariant: 20,
          minimumConversionsPerVariant: 3,
          elapsedDays: Number.isFinite(firstAssignedAt) ? Math.max(1, (asOf - firstAssignedAt) / DAY) : undefined,
          asOfMs: asOf,
          decisiveProbability: probabilities ? Math.max(...probabilities) : null,
        },
      );
      rows.forEach((row, i) => {
        row.estimate.chanceBest = probabilities?.[i] ?? null;
        row.estimate.relativeDelta = comparisons?.[i].relativeDelta ?? null;
        row.estimate.credibleInterval = comparisons?.[i].credibleInterval ?? null;
        row.estimate.readiness = readiness;
        row.estimate.reason = blocked;
      });
    }
    output.push({ experiment: group.experiment, name: group.name, language: group.language, paywalls: rows,
      ...(isRecoveryExperiment(group.experiment) ? { outcomeScope: group.experiment.includes("_v2_") ? "recovery_flow" as const : "recovery_eligibility" as const } : {}),
      placements: [...group.placements.values()].map((row) => summarize(row, asOf, true)).sort((a, b) => b.proceeds - a.proceeds) });
  }
  return { status: "ready", asOf, groups: output, warnings: [
    ...(parsed.invalid ? [`${parsed.invalid} malformed tracking records were excluded.`] : []),
    ...(missingMoney ? [`${missingMoney} transaction amounts are unavailable; proceeds are incomplete.`] : []),
    ...(awaitingMoney.length ? [`${awaitingMoney.length} verified purchases are awaiting Apple server revenue; proceeds may be incomplete.`] : []),
  ] };
}

function sameAssignment(a: PaywallRecord, b: PaywallRecord) {
  return a.experiment === b.experiment && a.variant === b.variant && a.paywall === b.paywall
    && a.language === b.language && a.assignedAt === b.assignedAt
    && a.expectedProduct === b.expectedProduct
    && JSON.stringify(a.allowedProducts ?? [a.expectedProduct]) === JSON.stringify(b.allowedProducts ?? [b.expectedProduct]);
}

function totalMoments(row: WorkingRow, asOf: number) {
  const people = [...row.people.values()].filter((p) => p.record.assignedAt <= asOf);
  const values = people.map((p) => p.money.filter((m) => m.at <= asOf));
  const proceeds = values.map((events) => events.reduce((sum, m) => sum + m.proceeds, 0));
  const n = proceeds.length;
  const mean = n ? proceeds.reduce((a, b) => a + b, 0) / n : 0;
  const variance = n > 1 ? proceeds.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (n - 1) : 0;
  const firstAssignedAt = people.length ? Math.min(...people.map((person) => person.record.assignedAt)) : null;
  return { n, mean, variance, se: Math.sqrt(variance / Math.max(n, 1)), paid: values.filter((events) => events.some((m) => m.revenue > 0)).length,
    firstAssignedAt,
    confounded: [...row.people.values()].some((p) => !p.record.randomized || p.record.hadFallback === true
      || Boolean(p.record.displayedProduct && !(p.record.allowedProducts ?? [p.record.expectedProduct]).includes(p.record.displayedProduct))),
    variantCount: Math.max(0, ...[...row.people.values()].map((p) => p.record.variantCount)) };
}

function summarize(row: WorkingRow, asOf: number, placement: boolean): NativePaywallRow {
  const people = [...row.people.values()];
  const money = people.flatMap((p) => p.money);
  const stats = totalMoments(row, asOf);
  return { id: row.id, label: row.label, paywall: row.paywall, users: people.length,
    views: people.filter((p) => p.record.viewedAt != null && p.record.viewedAt <= asOf).length,
    conversions: people.filter((p) => p.convertedAt != null).length,
    paid: people.filter((p) => p.money.some((m) => m.revenue > 0)).length,
    proceeds: money.reduce((sum, m) => sum + m.proceeds, 0),
    grossRevenue: money.reduce((sum, m) => sum + m.revenue, 0), refunds: money.reduce((sum, m) => sum + m.refund, 0),
    estimate: { users: stats.n, appu: stats.n ? stats.mean : null, chanceBest: null, relativeDelta: null, credibleInterval: null,
      readiness: null,
      reason: placement ? "Placements are not randomly assigned; no winner probability." : null } };
}

/** Normal approximation using actual per-user variance (including zeros and refunds). */
function probabilityBest(stats: { mean: number; se: number }[]): number[] {
  let seed = 104729;
  const random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return (seed + 1) / 4294967297; };
  const wins = stats.map(() => 0);
  for (let i = 0; i < 8_000; i++) {
    const samples = stats.map((s) => s.mean + s.se * Math.sqrt(-2 * Math.log(random())) * Math.cos(2 * Math.PI * random()));
    const max = Math.max(...samples);
    const tied = samples.flatMap((s, index) => s === max ? [index] : []);
    for (const index of tied) wins[index] += 1 / tied.length;
  }
  return wins.map((n) => n / 8_000);
}

function relativeAppuComparisons(stats: { mean: number; se: number }[]) {
  const control = stats[0];
  return stats.map((stat, index) => {
    if (index === 0) {
      const margin = 1.96 * control.se;
      const denominator = Math.max(Math.abs(control.mean), margin, 1e-6);
      return { relativeDelta: null, credibleInterval: [-margin / denominator, margin / denominator] as [number, number] };
    }
    const difference = stat.mean - control.mean;
    const standardError = Math.sqrt(stat.se ** 2 + control.se ** 2);
    const margin = 1.96 * standardError;
    const denominator = Math.abs(control.mean) > 1e-9
      ? Math.abs(control.mean)
      : Math.max(Math.abs(stat.mean), margin, 1e-6);
    return {
      relativeDelta: difference / denominator,
      credibleInterval: [(difference - margin) / denominator, (difference + margin) / denominator] as [number, number],
    };
  });
}
