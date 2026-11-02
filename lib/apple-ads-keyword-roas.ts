import type { AppleAdsKeywordRow } from "./apple-ads-keyword-analytics";

/** Revenue and actual spend must cover the same older UTC acquisition window. */
export function realizedKeywordRoas(row: AppleAdsKeywordRow): number | null {
  const basis = row.realizedRoasBasis;
  if (!basis || basis.missingMoney || basis.users <= 0 || basis.matureUsers !== basis.users
    || basis.endMs <= basis.startMs || basis.spendUsd == null || basis.spendUsd <= 0
    || ![basis.startMs, basis.endMs, basis.users, basis.proceeds, basis.spendUsd].every(Number.isFinite)) return null;
  const result = basis.proceeds / basis.spendUsd;
  return Number.isFinite(result) ? result : null;
}

export function realizedKeywordRoasPending(row: AppleAdsKeywordRow): boolean {
  const basis = row.realizedRoasBasis;
  return !!basis && (basis.endMs <= basis.startMs || basis.users === 0 || basis.matureUsers < basis.users);
}
