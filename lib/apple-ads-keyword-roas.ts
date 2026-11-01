import type { AppleAdsKeywordRow } from "./apple-ads-keyword-analytics";

/** Mature-user APPU / average acquisition cost in the same keyword/country window.
 * Apple reports aggregate spend, so the mature users' acquisition cost is estimated.
 */
export function realizedKeywordRoas(row: AppleAdsKeywordRow): number | null {
  const mature = row.realizedAppu;
  if (!mature || mature.missingMoney || row.missingMoney || mature.users <= 0 || row.users <= 0
    || mature.users > row.users || row.spendUsd == null || row.spendUsd <= 0
    || ![mature.users, mature.proceeds, row.users, row.spendUsd].every(Number.isFinite)) return null;
  const result = (mature.proceeds / mature.users) / (row.spendUsd / row.users);
  return Number.isFinite(result) ? result : null;
}
