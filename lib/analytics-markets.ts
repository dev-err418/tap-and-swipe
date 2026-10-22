import { buildAppOverviewCohorts, type AppOverviewTrend } from "./app-overview-cohorts";
import { versionCohortConversions, type VersionConversions } from "./version-cohort-conversions";
import type { MobileAppCountryRow, MobileAppPlanCountryRow, MobileAppRetentionCountryRow, TrialCancelTiming } from "./mobile-app-analytics";
import type { JourneyVersionCohort } from "./user-journey";

export const DEFAULT_APP_LANGUAGE = { poky: "all", glow: "all", versy: "all" } as const;
export function marketLanguage(value: string) {
  const code = value.trim().toLowerCase().split(/[-_]/)[0];
  return /^[a-z]{2,3}$/.test(code) ? code : "unknown";
}
export function marketCountry(value: string) {
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : "unknown";
}
export function marketKey(language: string, country: string) { return `${language}:${country}`; }
export function marketCountryLabel(code: string) {
  return code === "all" ? "All countries" : code === "unknown" ? "Unknown country"
    : new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
}
export type MarketSlice = {
  language: string; country: string; overview: AppOverviewTrend;
  versions: JourneyVersionCohort[]; conversions: VersionConversions;
  dataCountries?: MobileAppCountryRow[]; plans?: MobileAppPlanCountryRow[]; retention?: MobileAppRetentionCountryRow[]; trialCancelTiming?: TrialCancelTiming | null;
};
export type AnalyticsMarkets = { languages: string[]; countries: string[]; slices: Record<string, MarketSlice> };
type Input = Parameters<typeof buildAppOverviewCohorts>[0];
type Install = Input["installs"][number] & { appVersion: string; country: string; language: string };

/** Only aggregate metrics leave the server. Identity and market are frozen at the first install. */
export function buildAnalyticsMarkets(input: Omit<Input, "installs"> & { installs: Install[]; attributes: Map<string, Record<string, string>> }): AnalyticsMarkets {
  const first = new Map<string, Install>();
  for (const row of input.installs) {
    if (!row.appUserId || !Number.isFinite(row.installedAt)) continue;
    const previous = first.get(row.appUserId);
    if (!previous || row.installedAt < previous.installedAt) first.set(row.appUserId, row);
  }
  const selected = [...first.values()].filter((row) => row.installedAt >= input.startMs && row.installedAt < input.endMs && row.installedAt <= (input.asOf ?? Date.now()));
  const groups = new Map<string, { language: string; country: string; installs: Install[] }>();
  groups.set("all:all", { language: "all", country: "all", installs: [] });
  for (const row of selected) {
    const language = marketLanguage(row.language), country = marketCountry(row.country);
    for (const [l, c] of [["all", "all"], [language, "all"], ["all", country], [language, country]]) {
      const key = marketKey(l, c);
      const group = groups.get(key) ?? { language: l, country: c, installs: [] };
      group.installs.push(row);
      groups.set(key, group);
    }
  }
  const slices: Record<string, MarketSlice> = {};
  for (const [key, group] of groups) {
    const report = buildAppOverviewCohorts({ ...input, installs: group.installs, downloads: [] });
    const overview: AppOverviewTrend = { available: report.available, period: report.period, startMs: report.startMs, endMs: report.endMs, asOf: report.asOf,
      total: report.total, points: report.points.map((point) => ({ date: point.date, installs: point.trackedInstalls, trackedInstalls: point.trackedInstalls, total: point.total })) };
    const versions = [...versionCohortConversions(group.installs, input.events, input.attributes, input.startMs, input.endMs, input.asOf)]
      .map(([version, conversions]) => ({ version, conversions, installs: conversions.global.installs, tracked: conversions.global.installs, variants: [] }))
      .sort((a, b) => b.version.localeCompare(a.version, "en", { numeric: true }));
    const conversions = versionCohortConversions(group.installs.map((row) => ({ ...row, appVersion: "0" })), input.events, input.attributes, input.startMs, input.endMs, input.asOf).get("0")!;
    if (conversions) slices[key] = { language: group.language, country: group.country, overview, versions, conversions };
  }
  return { languages: [...new Set(selected.map((row) => marketLanguage(row.language)))].sort(),
    countries: [...new Set(selected.map((row) => marketCountry(row.country)))].sort(), slices };
}
