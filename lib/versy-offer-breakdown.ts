/** Product amounts are authoritative USD proceeds, never inferred from a SKU's price. */
export type OfferAmount = { subscriptions: number; proceeds: number; missingMoney: boolean };
export type OfferBreakdown = Record<string, OfferAmount>;
export type WithOfferBreakdown = { offerBreakdown?: OfferBreakdown };
type OfferEvent = {
  productId?: string; originalTransactionId?: string; transactionId?: string; appUserId?: string;
  netProceeds: number | null; isRefund?: boolean; periodType?: string;
};
const PREFIX = "com.arthurbuildsstuff.bible.";

/** Call only for the parent's selected, deduplicated money events. Identities stay server-side. */
export function createOfferAccumulator() {
  const subscriptions = new WeakMap<OfferBreakdown, Set<string>>();
  return (target: WithOfferBreakdown, event: OfferEvent) => {
    const breakdown = target.offerBreakdown ??= {};
    const product = event.productId || "unknown";
    const row = breakdown[product] ??= { subscriptions: 0, proceeds: 0, missingMoney: false };
    const money = event.netProceeds;
    if (money == null || !Number.isFinite(money)) {
      if (event.periodType !== "trial" || event.isRefund) row.missingMoney = true;
      return;
    }
    row.proceeds += money;
    if (event.isRefund || money <= 0 || event.periodType === "trial") return;
    const identity = event.originalTransactionId || event.transactionId || event.appUserId;
    if (!identity) { row.missingMoney = true; return; }
    const seen = subscriptions.get(breakdown) ?? new Set<string>();
    const key = `${product}|${identity}`;
    if (!seen.has(key)) { seen.add(key); row.subscriptions++; }
    subscriptions.set(breakdown, seen);
  };
}

/** Merge disjoint cohorts (e.g. install dates), never overlapping audience totals. */
export function mergeOfferBreakdowns(target: WithOfferBreakdown, source: WithOfferBreakdown) {
  if (!source.offerBreakdown) return;
  const breakdown = target.offerBreakdown ??= {};
  for (const [product, value] of Object.entries(source.offerBreakdown)) {
    const row = breakdown[product] ??= { subscriptions: 0, proceeds: 0, missingMoney: false };
    row.subscriptions += value.subscriptions;
    row.proceeds += value.proceeds;
    row.missingMoney ||= value.missingMoney;
  }
}

export function hasVersyProducts(events: { productId?: string }[]) {
  return events.some((event) => event.productId?.startsWith(PREFIX));
}

/** Missing product fields on refunds/renewals may follow a known charge, not today's assigned offer. */
export function offerProductResolver(events: OfferEvent[]) {
  const transactions = new Map<string, Set<string>>();
  const chains = new Map<string, Set<string>>();
  for (const event of events) {
    if (!event.productId || event.isRefund) continue;
    for (const [map, key] of [[transactions, event.transactionId ? `${event.originalTransactionId}|${event.transactionId}` : ""],
      [chains, event.originalTransactionId]] as const) {
      if (!key) continue;
      const products = map.get(key) ?? new Set<string>();
      products.add(event.productId); map.set(key, products);
    }
  }
  return (event: OfferEvent) => {
    if (event.productId) return event.productId;
    const products = transactions.get(`${event.originalTransactionId}|${event.transactionId}`)
      ?? chains.get(event.originalTransactionId ?? "");
    return products?.size === 1 ? [...products][0] : undefined;
  };
}

export function versyOfferRows(breakdown: OfferBreakdown = {}) {
  const sum = (products: string[]): OfferAmount => products.reduce<OfferAmount>((result, product) => {
    const row = breakdown[product];
    if (row) { result.subscriptions += row.subscriptions; result.proceeds += row.proceeds; result.missingMoney ||= row.missingMoney; }
    return result;
  }, { subscriptions: 0, proceeds: 0, missingMoney: false });
  const yearly39 = `${PREFIX}yearly_3999_80`, yearly49 = `${PREFIX}yearly_4999`;
  const weekly = `${PREFIX}Weekly`, recovery = `${PREFIX}YearlyDiscount`;
  const known = new Set([yearly39, yearly49, weekly, recovery]);
  const other = Object.keys(breakdown).filter((id) => !known.has(id)
    && (breakdown[id].subscriptions > 0 || breakdown[id].proceeds !== 0 || breakdown[id].missingMoney));
  return [
    { key: "main", label: "Main offer", detail: "$39.99 + $49.99 yearly", ...sum([yearly39, yearly49]),
      children: [{ label: "$39.99 yearly", ...sum([yearly39]) }, { label: "$49.99 yearly", ...sum([yearly49]) }] },
    { key: "weekly", label: "Side offer", detail: "Weekly", ...sum([weekly]), children: [] },
    { key: "recovery", label: "Recovery / daily gift", detail: "$16.99 yearly", ...sum([recovery]), children: [] },
    ...(other.length ? [{ key: "other", label: "Other / historical", detail: "Includes retired yearly products", ...sum(other), children: [] }] : []),
  ];
}
