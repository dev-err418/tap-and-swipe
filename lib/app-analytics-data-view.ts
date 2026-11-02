import type { MobileAppAnalytics } from "./mobile-app-analytics";
import { DEFAULT_APP_LANGUAGE, marketKey } from "./analytics-markets";

/** Data pages expose all users and their country-picker choices, not every locale intersection. */
export function compactAppDataView(report: MobileAppAnalytics): MobileAppAnalytics {
  const language = DEFAULT_APP_LANGUAGE[report.id];
  const countries = ["all", ...(report.countryComparisons?.options.map((option) => option.code) ?? [])];
  const markets = report.markets ? {
    languages: [language], countries: countries.filter((country) => country !== "all"),
    slices: Object.fromEntries(countries.flatMap((country) => {
      const key = marketKey(language, country), slice = report.markets!.slices[key];
      return slice ? [[key, { ...slice, versions: slice.versions.filter((row) => row.version !== "unknown").slice(0, 5) }]] : [];
    })),
  } : undefined;
  // Compatible older snapshots may contain the retired average-cost ROAS estimate.
  const strictRows = (rows: NonNullable<MobileAppAnalytics["appleAdsKeywords"]>["rows"]) => rows.map((row) =>
    row.realizedRoasBasis ? row : { ...row, realizedRoas: null });
  return { ...report, markets,
    appleAdsKeywords: report.appleAdsKeywords ? { ...report.appleAdsKeywords,
      rows: strictRows(report.appleAdsKeywords.rows),
      countries: Object.fromEntries(Object.entries(report.appleAdsKeywords.countries).map(([country, rows]) => [country, strictRows(rows)])),
    } : report.appleAdsKeywords,
  };
}
