import { marketCountry } from "./analytics-markets";

export type AnalyticsCountryOption = { code: string; proceeds: number };

/** Rank known countries by net proceeds earned within the selected reporting period. */
export function topAnalyticsCountries(countries: { country: string; proceeds: number }[]): AnalyticsCountryOption[] {
  const totals = new Map<string, number>();
  for (const row of countries) {
    const code = marketCountry(row.country);
    if (code !== "unknown" && Number.isFinite(row.proceeds)) {
      totals.set(code, (totals.get(code) ?? 0) + row.proceeds);
    }
  }
  return [...totals].map(([code, proceeds]) => ({ code, proceeds }))
    .sort((a, b) => b.proceeds - a.proceeds || a.code.localeCompare(b.code)).slice(0, 3);
}
