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

export const PAYWALL_HORIZONS = [7, 14, 30] as const;
export type PaywallHorizon = (typeof PAYWALL_HORIZONS)[number];
type Estimate = {
  users: number;
  appu: number | null;
  chanceBest: number | null;
  relativeDelta: number | null;
  credibleInterval: [number, number] | null;
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
  funnelAppu: number | null;
  estimates: Record<PaywallHorizon, Estimate>;
};
export type NativePaywallGroup = {
  experiment: string;
  name: string;
  language: string;
  paywallRevenueScope: "direct_attribution" | "weighted_funnel";
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

export function buildNativePaywallReport(attributes: PaywallAttribute[], revenue: PaywallRevenue[], start: number, end: number, asOf = Date.now()): NativePaywallReport {
  const parsed = parsePaywallAttributes(attributes);
  const groups = new Map<string, WorkingGroup>();
  const inCohort = (r: PaywallRecord) => r.assignedAt >= start && r.assignedAt < end && r.assignedAt <= asOf;
  const groupFor = (r: PaywallRecord, language: string) => {
    const id = `${r.experiment}|${language}`;
    let group = groups.get(id);
    if (!group) {
      group = { experiment: r.experiment, name: r.experimentName, language, paywalls: new Map(), placements: new Map() };
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
        row = { id, label: placement ? r.placement! : r.variantName, paywall: placement ? "" : r.paywall, people: new Map() };
        rows.set(id, row);
      }
      row.people.set(owner, { record: r, convertedAt: null, money: [] });
    }
  };
  for (const [key, r] of parsed.assignments) enroll(key.slice(0, key.lastIndexOf("|")), r, false);
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
      return [group?.paywalls.get(`${context.variant}|${context.paywall}`)?.people.get(owner),
        group?.placements.get(context.placement ?? "")?.people.get(owner)].filter((p): p is Person => Boolean(p));
    });
  };

  const anchors = new Map<string, { owner: string; purchase: PaywallPurchase }[]>();
  for (const item of parsed.purchases) {
    const p = item.purchase;
    if (p.purchasedAt > asOf) continue;
    const list = anchors.get(p.originalTransactionID) ?? [];
    list.push(item);
    anchors.set(p.originalTransactionID, list);
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
  const awaitingMoney = parsed.purchases.filter(({ purchase: p }) => inCohort(p.context) && p.purchasedAt <= asOf
    && !receivedTransactions.has(`${p.originalTransactionID}|${p.transactionID}`));
  let missingMoney = 0;
  for (const event of unique.values()) {
    const list = anchors.get(event.originalTransactionId);
    if (!list) continue;
    const targetTime = dateMs(event.purchasedAt);
    // A refund belongs to its charged transaction, not to a later resubscription/paywall.
    const item = list.find(({ purchase }) => purchase.transactionID === event.transactionId)
      ?? list.find(({ purchase }) => purchase.purchasedAt <= (Number.isFinite(targetTime) ? targetTime : dateMs(event.ts)));
    if (!item) continue;
    const people = peopleFor(item.owner, item.purchase.context);
    if (!people.length) continue;
    if (event.price == null || event.proceeds == null || !Number.isFinite(Number(event.price)) || !Number.isFinite(Number(event.proceeds))) {
      missingMoney++;
      continue;
    }
    const refund = Number(event.isRefund) === 1 || Number(event.price) < 0;
    const proceeds = refund ? -Math.abs(Number(event.proceeds)) : Number(event.proceeds);
    for (const person of people) person.money.push({ at: dateMs(event.ts), proceeds,
      revenue: refund ? 0 : Math.max(0, Number(event.price)), refund: refund ? Math.abs(Number(event.price)) : 0 });
  }

  const output: NativePaywallGroup[] = [];
  for (const group of groups.values()) {
    const paywalls = [...group.paywalls.values()].sort((a, b) => a.id.localeCompare(b.id));
    const paywallRevenueScope = isRecoveryComparison(paywalls) ? "weighted_funnel" : "direct_attribution";
    const rows = paywalls.map((row) => summarize(row, asOf, false));
    for (const horizon of PAYWALL_HORIZONS) {
      const stats = paywalls.map((row) => moments(row, asOf, horizon));
      const expected = Math.max(0, ...stats.map((s) => s.variantCount));
      const blocked = parsed.invalid > 0 ? "Some tracking records are invalid; winner estimates are unavailable."
        : missingMoney > 0 ? "Some transaction amounts are unavailable."
        : awaitingMoney.some(({ purchase: p }) => p.context.experiment === group.experiment && (group.language === "all" || p.context.language === group.language)) ? "Waiting for Apple server revenue to reconcile verified purchases."
        : rows.length < 2 || rows.length !== expected ? "Waiting for all variants."
        : stats.some((s) => s.confounded) ? "Includes existing assignments or a fallback offer; not a clean randomized cohort."
        : stats.some((s) => s.n < 50 || s.paid < 5) ? `Needs 50 mature users and 5 paid users per variant at D${horizon}.` : null;
      const probabilities = blocked ? null : probabilityBest(stats);
      const comparisons = blocked ? null : relativeAppuComparisons(stats);
      rows.forEach((row, i) => {
        row.estimates[horizon].chanceBest = probabilities?.[i] ?? null;
        row.estimates[horizon].relativeDelta = comparisons?.[i].relativeDelta ?? null;
        row.estimates[horizon].credibleInterval = comparisons?.[i].credibleInterval ?? null;
        row.estimates[horizon].reason = blocked;
      });
    }
    output.push({ experiment: group.experiment, name: group.name, language: group.language, paywallRevenueScope, paywalls: rows,
      placements: [...group.placements.values()].map((row) => summarize(row, asOf, true)).sort((a, b) => b.proceeds - a.proceeds) });
  }
  for (const group of output.filter((candidate) => candidate.paywallRevenueScope === "weighted_funnel")) {
    const main = output.find((candidate) => candidate.language === group.language
      && candidate.experiment === group.experiment.replace("_recovery_", "_main_"));
    const mainUsers = main?.paywalls.reduce((sum, row) => sum + row.users, 0) ?? 0;
    const mainProceeds = main?.paywalls.reduce((sum, row) => sum + row.proceeds, 0) ?? 0;
    for (const row of group.paywalls) {
      const isRecovery = row.id.split("|", 1)[0] === "recovery";
      const users = mainUsers + (isRecovery ? row.users : 0);
      const proceeds = mainProceeds + (isRecovery ? row.proceeds : 0);
      row.funnelAppu = users ? proceeds / users : null;
    }
  }
  return { status: "ready", asOf, groups: output, warnings: [
    ...(parsed.invalid ? [`${parsed.invalid} malformed tracking records were excluded.`] : []),
    ...(missingMoney ? [`${missingMoney} transaction amounts are unavailable; proceeds are incomplete.`] : []),
    ...(awaitingMoney.length ? [`${awaitingMoney.length} verified purchases are awaiting Apple server revenue; proceeds may be incomplete.`] : []),
  ] };
}

function isRecoveryComparison(rows: WorkingRow[]) {
  const variants = new Set(rows.flatMap((row) => [...row.people.values()].map((person) => person.record.variant)));
  return variants.has("recovery") && (variants.has("holdout") || variants.has("no_recovery"));
}

function sameAssignment(a: PaywallRecord, b: PaywallRecord) {
  return a.experiment === b.experiment && a.variant === b.variant && a.paywall === b.paywall
    && a.language === b.language && a.assignedAt === b.assignedAt
    && a.expectedProduct === b.expectedProduct
    && JSON.stringify(a.allowedProducts ?? [a.expectedProduct]) === JSON.stringify(b.allowedProducts ?? [b.expectedProduct]);
}

function moments(row: WorkingRow, asOf: number, days: number) {
  const people = [...row.people.values()].filter((p) => p.record.assignedAt + days * DAY <= asOf);
  const values = people.map((p) => p.money.filter((m) => m.at <= p.record.assignedAt + days * DAY));
  const proceeds = values.map((events) => events.reduce((sum, m) => sum + m.proceeds, 0));
  const n = proceeds.length;
  const mean = n ? proceeds.reduce((a, b) => a + b, 0) / n : 0;
  const variance = n > 1 ? proceeds.reduce((sum, x) => sum + (x - mean) ** 2, 0) / (n - 1) : 0;
  return { n, mean, se: Math.sqrt(variance / Math.max(n, 1)), paid: values.filter((events) => events.some((m) => m.revenue > 0)).length,
    confounded: [...row.people.values()].some((p) => !p.record.randomized || p.record.hadFallback === true
      || Boolean(p.record.displayedProduct && !(p.record.allowedProducts ?? [p.record.expectedProduct]).includes(p.record.displayedProduct))),
    variantCount: Math.max(0, ...[...row.people.values()].map((p) => p.record.variantCount)) };
}

function summarize(row: WorkingRow, asOf: number, placement: boolean): NativePaywallRow {
  const people = [...row.people.values()];
  const money = people.flatMap((p) => p.money);
  return { id: row.id, label: row.label, paywall: row.paywall, users: people.length,
    views: people.filter((p) => p.record.viewedAt != null && p.record.viewedAt <= asOf).length,
    conversions: people.filter((p) => p.convertedAt != null).length,
    paid: people.filter((p) => p.money.some((m) => m.revenue > 0)).length,
    proceeds: money.reduce((sum, m) => sum + m.proceeds, 0),
    grossRevenue: money.reduce((sum, m) => sum + m.revenue, 0), refunds: money.reduce((sum, m) => sum + m.refund, 0), funnelAppu: null,
    estimates: Object.fromEntries(PAYWALL_HORIZONS.map((days) => {
      const stats = moments(row, asOf, days);
      return [days, { users: stats.n, appu: stats.n ? stats.mean : null, chanceBest: null, relativeDelta: null, credibleInterval: null,
        reason: placement ? "Placements are not randomly assigned; no winner probability." : null }];
    })) as Record<PaywallHorizon, Estimate> };
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
