import { versionCohortConversions } from "./version-cohort-conversions";

export const VERSY_META_MARKETS = [
  { code: "FR", name: "France", flag: "🇫🇷", campaigns: [
    { id: "120255328753620450", name: "FR - Trials - Versy" },
    { id: "120255385345590450", name: "FR - Qualified Trials (2h) - Versy" },
  ] },
  { code: "DE", name: "Germany", flag: "🇩🇪", campaigns: [
    { id: "120255328782510450", name: "DE - Trials - Versy - Copy" },
  ] },
] as const;
const DAY = 86_400_000;
export type RoasDay = { date: string; immature: boolean };
export type RoasMetric = { spend: number; proceeds: number | null; roas: number | null };
export type OrganicMetric = { installs: number; proceeds: number | null };
export type VersyRoasReport = {
  status: "ready" | "unavailable";
  updatedAt: string;
  days: RoasDay[];
  campaigns: Record<string, Record<string, RoasMetric>>;
  organic: Record<string, Record<string, OrganicMetric>>;
};
export type AcquisitionChart = {
  series?: { key: string; breakdown: string }[];
  data: { x: string; values: Record<string, { y: number | null }> }[];
};

export function roasDays(now = new Date()): RoasDay[] {
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  return Array.from({ length: 30 }, (_, i) => ({ date: new Date(today - (29 - i) * DAY).toISOString().slice(0, 10), immature: 29 - i < 7 }));
}
export function roasRatio(proceeds: number | null, spend: number): number | null {
  return proceeds == null || spend <= 0 ? null : proceeds / spend;
}
export function campaignDays(proceedsChart: AcquisitionChart, spendChart: AcquisitionChart, days: RoasDay[]): VersyRoasReport["campaigns"] {
  const campaigns: VersyRoasReport["campaigns"] = {};
  const proceedsByDate = new Map(proceedsChart.data.map((point) => [point.x.slice(0, 10), point.values]));
  const spendByDate = new Map(spendChart.data.map((point) => [point.x.slice(0, 10), point.values]));
  for (const market of VERSY_META_MARKETS) for (const { id } of market.campaigns) {
    campaigns[id] = Object.fromEntries(days.map(({ date }) => {
      const spendValue = spendByDate.get(date)?.[id];
      const proceedsValue = proceedsByDate.get(date)?.[id];
      // Sparse chart entries mean no activity; an explicit null remains unavailable.
      const spend = spendValue ? spendValue.y : 0;
      const proceeds = proceedsValue ? proceedsValue.y : 0;
      if (spend == null || !Number.isFinite(spend) || (proceeds != null && !Number.isFinite(proceeds))) throw new Error("Incomplete acquisition chart amounts");
      return [date, { spend, proceeds, roas: roasRatio(proceeds, spend) }];
    }));
  }
  return campaigns;
}

type Install = Parameters<typeof versionCohortConversions>[0][number] & { country: string };
type Event = Parameters<typeof versionCohortConversions>[1][number];
/** Reuse the dashboard's transaction ownership, refund, renewal and missing-money rules. */
export function organicDays(installs: Install[], events: Event[], attributes: Map<string, Record<string, string>>, days: RoasDay[], asOf: number): VersyRoasReport["organic"] {
  const organic: VersyRoasReport["organic"] = {};
  for (const market of VERSY_META_MARKETS) {
    organic[market.code] = {};
    const countryInstalls = installs.filter((install) => install.country === market.code);
    for (const { date } of days) {
      const start = Date.parse(`${date}T00:00:00Z`);
      const metrics = [...versionCohortConversions(countryInstalls, events, attributes, start, start + DAY, asOf).values()].map((row) => row.nonAds);
      organic[market.code][date] = {
        installs: metrics.reduce((sum, metric) => sum + metric.installs, 0),
        proceeds: metrics.some((metric) => metric.missingProceeds) ? null : metrics.reduce((sum, metric) => sum + metric.proceeds, 0),
      };
    }
  }
  return organic;
}
export function totalRoas(report: VersyRoasReport, country: typeof VERSY_META_MARKETS[number], date: string) {
  const campaigns = country.campaigns.map(({ id }) => report.campaigns[id]?.[date]);
  const organic = report.organic[country.code]?.[date];
  if (!organic || organic.proceeds == null || campaigns.some((row) => !row || row.proceeds == null)) return null;
  return roasRatio(campaigns.reduce((sum, row) => sum + row.proceeds!, organic.proceeds), campaigns.reduce((sum, row) => sum + row.spend, 0));
}
