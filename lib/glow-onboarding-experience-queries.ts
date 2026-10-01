import { buildGlowOnboardingReport, onboardingCohort, GLOW_ONBOARDING_KEY, type GlowOnboardingReport } from "./glow-onboarding-experience";
import type { PaywallAttribute, PaywallRevenue } from "./native-paywall-analytics";

type Query = <T>(sql: string) => Promise<T[]>;
const quote = (s: string) => `'${s.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;

export async function loadGlowOnboardingExperience(query: Query, applicationId: number, start: number, end: number): Promise<GlowOnboardingReport> {
  const asOf = Date.now();
  try {
    const attributes: PaywallAttribute[] = [];
    let cursor: PaywallAttribute | undefined;
    for (;;) {
      const rows = await query<PaywallAttribute>(`
SELECT appUserId, key, value FROM sw.user_attributes_rep FINAL
WHERE applicationId = ${applicationId} AND isSandbox = 0 AND isDeleted = 0 AND ts < now()
  AND (key = '${GLOW_ONBOARDING_KEY}' OR startsWith(key, 'gp1_t_'))
  ${cursor === undefined ? "" : `AND (appUserId, key) > (${quote(cursor.appUserId)}, ${quote(cursor.key)})`}
ORDER BY appUserId, key LIMIT 10000 FORMAT JSON`);
      attributes.push(...rows);
      if (rows.length < 10000) break;
      const next = rows.at(-1)!;
      if (attributes.length >= 200000 || (next.appUserId === cursor?.appUserId && next.key === cursor?.key)) throw new Error("Assignment reporting limit reached");
      cursor = next;
    }
    const users = [...onboardingCohort(attributes, start, end, asOf).records.keys()];
    const events: PaywallRevenue[] = [];
    // Sequential chunks bound query load and reject partial money results.
    for (let i = 0; i < users.length; i += 500) {
      const rows = await query<PaywallRevenue>(`
SELECT appUserId, id, name, originalTransactionId, transactionId, isRefund, price, proceeds, ts, purchasedAt, attributionTs
FROM open_revenue.attributed_events_by_ts_rep FINAL
WHERE applicationId = ${applicationId} AND isSandbox = 0 AND source = 'integration' AND isFamilyShare = 0
  AND appUserId IN (${users.slice(i, i + 500).map(quote).join(",")})
  AND ts >= fromUnixTimestamp64Milli(${Math.trunc(start)}) AND ts < fromUnixTimestamp64Milli(${asOf})
  AND (name IN ('initial_purchase', 'renewal', 'non_renewing_purchase', 'cancellation') OR isRefund = 1)
LIMIT 50001 FORMAT JSON`);
      if (rows.length > 50000) throw new Error("Revenue reporting limit reached");
      events.push(...rows);
    }
    return buildGlowOnboardingReport(attributes, events, start, end, asOf);
  } catch {
    return { status: "unavailable", asOf, rows: [], warnings: ["Onboarding experience reporting is unavailable. Refresh to retry."] };
  }
}
