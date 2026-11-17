import { isMobileMoneyEvent } from "./mobile-app-money";
import { marketCountry } from "./analytics-markets";

export type AnalyticsCountryOption = { code: string; proceeds: number };

/** Rank normalized countries by net proceeds, using the same rule for every app. */
export function analyticsCountryOptions(_appId: "glow" | "poky" | "versy", countries: { country: string; proceeds: number }[]): AnalyticsCountryOption[] {
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

/** Rank transaction proceeds in the last 30 days, independent of install or UI date filters. */
export function monthlyCountryProceeds(events: {
  country: string; eventTs: number; name: string; netProceeds: number | null;
}[], asOf: number): { country: string; proceeds: number }[] {
  const since = asOf - 30 * 86_400_000;
  const totals = new Map<string, number>();
  for (const event of events) {
    if (event.eventTs < since || event.eventTs >= asOf || !isMobileMoneyEvent(event)
      || event.netProceeds == null || !Number.isFinite(event.netProceeds)) continue;
    const country = marketCountry(event.country);
    if (country === "unknown") continue;
    totals.set(country, (totals.get(country) ?? 0) + event.netProceeds);
  }
  return [...totals].map(([country, proceeds]) => ({ country, proceeds }));
}
