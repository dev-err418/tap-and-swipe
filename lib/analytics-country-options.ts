import { marketCountry } from "./analytics-markets";

export type AnalyticsCountryOption = { code: string; installs: number };

/** Rank known countries by unique first installs; later visits cannot change a user's country. */
export function topAnalyticsCountries(installs: { appUserId: string; installedAt: number; country: string }[]): AnalyticsCountryOption[] {
  const first = new Map<string, (typeof installs)[number]>();
  for (const install of installs) {
    const previous = first.get(install.appUserId);
    if (install.appUserId && Number.isFinite(install.installedAt) && (!previous || install.installedAt < previous.installedAt)) {
      first.set(install.appUserId, install);
    }
  }
  const totals = new Map<string, number>();
  for (const install of first.values()) {
    const code = marketCountry(install.country);
    if (code !== "unknown") totals.set(code, (totals.get(code) ?? 0) + 1);
  }
  return [...totals].map(([code, installs]) => ({ code, installs }))
    .sort((a, b) => b.installs - a.installs || a.code.localeCompare(b.code)).slice(0, 3);
}
