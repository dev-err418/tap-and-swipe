import { isMobileMoneyEvent } from "./mobile-app-money";

const DAY = 86_400_000;
export type RealizedAppu = { users: number; proceeds: number; missingMoney: boolean };
export type WithRealizedAppu = { realizedAppu?: RealizedAppu };
type Member = { appUserId: string; startedAt: number; trialDays: number };
type Event = {
  appUserId: string; originalTransactionId: string; transactionId?: string;
  name: string; periodType?: string; isRefund?: boolean;
  eventTs: number; attributionTs?: number; expiresAt?: number; netProceeds: number | null;
};

export const emptyRealizedAppu = (): RealizedAppu => ({ users: 0, proceeds: 0, missingMoney: false });
export function mergeRealizedAppu(target: WithRealizedAppu, source: WithRealizedAppu) {
  if (!source.realizedAppu) return;
  const total = target.realizedAppu ??= emptyRealizedAppu();
  total.users += source.realizedAppu.users;
  total.proceeds += source.realizedAppu.proceeds;
  total.missingMoney ||= source.realizedAppu.missingMoney;
}
export function realizedAppuValue(metric: RealizedAppu | undefined): number | null {
  return metric && metric.users > 0 && !metric.missingMoney ? metric.proceeds / metric.users : null;
}
export function realizedAppuSuffix(metric: RealizedAppu | undefined): string {
  if (!metric) return "";
  const value = realizedAppuValue(metric);
  return ` (${value == null ? "—" : value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 })} realized)`;
}

export function versyProductTrialDays(product?: string): number {
  if (product?.endsWith(".trial3")) return 3;
  if (product === "com.arthurbuildsstuff.bible.YearlyDiscount" || product === "com.arthurbuildsstuff.bible.Weekly") return 0;
  // Historical/unknown standard offers use the full seven-day observation window.
  return 7;
}

/** Prefer the immutable offer at enrollment; an upgrade must not shorten its history. */
export function versyMember(install: { appUserId: string; installedAt: number },
  attributes?: Record<string, string>, outcomeStart = install.installedAt): Member {
  const startedAt = Math.max(install.installedAt, outcomeStart);
  let product: string | undefined;
  const currentAssignedAt = Number(attributes?.yearly_price_assigned_at);
  if (Number.isFinite(currentAssignedAt) && currentAssignedAt > 0 && currentAssignedAt === outcomeStart) {
    product = attributes?.yearly_price_product_id;
  } else {
    try {
      let record = JSON.parse(attributes?.gp1_a_versy_onboarding_outcomes_v1 ?? "null");
      if (typeof record === "string") record = JSON.parse(record);
      if (record?.schema === 1 && record.environment === "production" && typeof record.expectedProduct === "string") product = record.expectedProduct;
    } catch { /* Unknown original offers retain the conservative seven-day window. */ }
  }
  return { appUserId: install.appUserId, startedAt, trialDays: versyProductTrialDays(product) };
}

export function isVersyAppu(events: { productId?: string }[], attributes?: Map<string, Record<string, string>>) {
  return events.some((event) => event.productId?.startsWith("com.arthurbuildsstuff.bible."))
    || [...(attributes?.values() ?? [])].some((values) => values.versy_tracking_environment !== undefined);
}

/** Mature users include non-payers and cancelled trials. A paid charge never qualifies a user early. */
export function realizedAppuByUser(members: Member[], events: Event[], asOf: number): Map<string, RealizedAppu> {
  const selected = new Map(members.filter((m) => m.appUserId && Number.isFinite(m.startedAt) && m.startedAt <= asOf)
    .map((m) => [m.appUserId, m]));
  const observed = events.filter((e) => Number.isFinite(e.eventTs) && e.eventTs <= asOf);
  const owners = new Map<string, { user: string; at: number }>();
  for (const e of observed) {
    if (e.name !== "initial_purchase" || e.isRefund || !e.originalTransactionId || !e.appUserId) continue;
    const previous = owners.get(e.originalTransactionId);
    if (!previous || e.eventTs < previous.at) owners.set(e.originalTransactionId, { user: e.appUserId, at: e.eventTs });
  }
  const eligibleAt = new Map([...selected].map(([user, m]) => [user, m.startedAt + m.trialDays * DAY]));
  const trials = new Map<string, { event: Event; user: string }>();
  const money = new Map<string, { event: Event; user: string }>();
  for (const event of observed) {
    const owner = owners.get(event.originalTransactionId);
    const user = owner?.user ?? event.appUserId;
    const member = selected.get(user);
    if (!member || event.eventTs < member.startedAt || (owner && owner.at < member.startedAt)) continue;
    if (event.name === "initial_purchase" && event.periodType === "trial" && !event.isRefund) {
      const key = event.originalTransactionId || user;
      const previous = trials.get(key)?.event;
      if (!previous || event.eventTs < previous.eventTs || (event.eventTs === previous.eventTs
        && (event.attributionTs ?? 0) > (previous.attributionTs ?? 0))) trials.set(key, { event, user });
    }
    if (!isMobileMoneyEvent(event) && !event.isRefund) continue;
    const key = `${event.originalTransactionId || user}|${event.transactionId || event.eventTs}|${event.isRefund ? "refund" : "charge"}`;
    const previous = money.get(key)?.event;
    if (!previous || (event.attributionTs ?? 0) > (previous.attributionTs ?? 0)) money.set(key, { event, user });
  }
  for (const { event, user } of trials.values()) {
    const end = event.expiresAt;
    // Missing expiry is unknown maturity, not a zero-day trial. Cancellation and
    // Apple's early renewal delivery do not move the scheduled end forward.
    eligibleAt.set(user, Number.isFinite(end) && end! > event.eventTs
      ? Math.max(eligibleAt.get(user)!, end!) : Infinity);
  }
  const result = new Map([...eligibleAt].filter(([, at]) => at <= asOf)
    .map(([user]) => [user, { ...emptyRealizedAppu(), users: 1 }]));
  for (const { event, user } of money.values()) {
    const row = result.get(user);
    if (!row) continue;
    if (event.name === "initial_purchase" && event.periodType === "trial" && !event.isRefund) continue;
    if (event.netProceeds == null || !Number.isFinite(event.netProceeds)) row.missingMoney = true;
    else row.proceeds += event.isRefund ? -Math.abs(event.netProceeds) : event.netProceeds;
  }
  return result;
}
