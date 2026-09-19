import { buildNativePaywallReport, parsePaywallAttributes, type NativePaywallReport, type PaywallAttribute, type PaywallRevenue } from "./native-paywall-analytics";

type Query = <T>(sql: string) => Promise<T[]>;
const quote = (s: string) => `'${s.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;

/** Read only; no ingestion endpoint, schema, campaign or Superwall placement is created. */
export async function loadNativePaywalls(query: Query, applicationID: number, start: number, end: number): Promise<NativePaywallReport> {
  const asOf = Date.now();
  try {
    const attributes: PaywallAttribute[] = [];
    let cursor: PaywallAttribute | undefined;
    // Keyset pagination avoids silently treating a truncated user dump as the denominator.
    for (;;) {
      const rows: PaywallAttribute[] = await query<PaywallAttribute>(`
SELECT appUserId, key, value FROM sw.user_attributes_rep FINAL
WHERE applicationId = ${applicationID} AND isSandbox = 0 AND isDeleted = 0 AND ts < now()
  AND startsWith(key, 'gp1_')
  ${cursor ? `AND (appUserId, key) > (${quote(cursor.appUserId)}, ${quote(cursor.key)})` : ""}
ORDER BY appUserId, key LIMIT 10000 FORMAT JSON`);
      attributes.push(...rows);
      if (rows.length < 10000) break;
      if (attributes.length >= 200000) throw new Error("Tracking data exceeds the current reporting limit. Narrowing the cohort requires a query upgrade.");
      cursor = rows.at(-1);
    }
    const parsed = parsePaywallAttributes(attributes);
    const originals = [...new Set(parsed.purchases.filter(({ purchase: p }) =>
      p.context.assignedAt >= start && p.context.assignedAt < end && p.purchasedAt <= asOf
    ).map(({ purchase: p }) => p.originalTransactionID))];
    const events: PaywallRevenue[] = [];
    for (let i = 0; i < originals.length; i += 500) {
      const rows = await query<PaywallRevenue>(`
SELECT id, name, originalTransactionId, transactionId, isRefund, price, proceeds, ts, purchasedAt, attributionTs
FROM open_revenue.attributed_events_by_ts_rep FINAL
WHERE applicationId = ${applicationID} AND isSandbox = 0 AND source = 'integration' AND isFamilyShare = 0
  AND originalTransactionId IN (${originals.slice(i, i + 500).map(quote).join(",")})
  AND ts >= fromUnixTimestamp64Milli(${Math.trunc(start)}) AND ts < fromUnixTimestamp64Milli(${asOf})
  AND (name IN ('initial_purchase', 'renewal', 'non_renewing_purchase') OR isRefund = 1)
LIMIT 50001 FORMAT JSON`);
      if (rows.length > 50000) throw new Error("Transaction data exceeds the current reporting limit.");
      events.push(...rows);
    }
    return buildNativePaywallReport(attributes, events, start, end, asOf);
  } catch (error) {
    console.error("native_paywall_report_failed", error instanceof Error ? error.message : "Unknown error");
    return { status: "unavailable", asOf, groups: [], warnings: ["Paywall reporting is temporarily unavailable. Refresh to retry."] };
  }
}
