import { marketCountry } from "./analytics-markets";

export type AnalyticsCountryOption = { code: string; proceeds: number };

/** Versy uses fixed markets. Other apps rank countries by period net proceeds. */
export function analyticsCountryOptions(appId: "glow" | "poky" | "versy", countries: { country: string; proceeds: number }[]): AnalyticsCountryOption[] {
  const totals = new Map<string, number>();
  for (const row of countries) {
    const code = marketCountry(row.country);
    if (code !== "unknown" && Number.isFinite(row.proceeds)) {
      totals.set(code, (totals.get(code) ?? 0) + row.proceeds);
    }
  }
  if (appId === "versy") {
    return ["US", "FR", "DE"].map((code) => ({ code, proceeds: totals.get(code) ?? 0 }));
  }
  return [...totals].map(([code, proceeds]) => ({ code, proceeds }))
    .sort((a, b) => b.proceeds - a.proceeds || a.code.localeCompare(b.code)).slice(0, 3);
}
