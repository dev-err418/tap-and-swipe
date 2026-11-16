import "server-only";
import { analyticsSnapshot } from "./analytics-snapshot";
import { getVersyAcquisitionFacts } from "./mobile-app-analytics";
import { campaignDays, organicDays, roasDays, type RoasChart, type VersyRoasReport } from "./versy-meta-roas";

export async function getVersyMetaRoas(): Promise<VersyRoasReport> {
  const now = new Date(), days = roasDays(now);
  try {
    return await analyticsSnapshot(`versy-meta-roas-v1:${days.at(-1)!.date}`, async () => {
      const apiKey = process.env.SUPERWALL_VERSY_API_KEY?.trim();
      if (!apiKey) throw new Error("SUPERWALL_VERSY_API_KEY is not configured");
      const from = `${days[0].date}T00:00:00Z`;
      const [response, facts] = await Promise.all([
        fetch("https://api.superwall.com/v2/charts/data", {
          method: "POST", cache: "no-store", signal: AbortSignal.timeout(60_000),
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ application_id: "51393", y_axis: "roas", x_axis: "installDate",
            breakdown: "acquisitionCampaignId", date_interval: "day", environment: ["PRODUCTION"],
            date_filter: { dimension: "installDate", preset: "custom", range: { from, to: now.toISOString() } } }),
        }),
        getVersyAcquisitionFacts(from, now.toISOString()),
      ]);
      if (!response.ok) throw new Error(`Superwall ROAS returned ${response.status}`);
      const chart = await response.json() as RoasChart;
      if (!Array.isArray(chart.data) || !chart.series?.every((s) => s.breakdown === "acquisitionCampaignId")) throw new Error("Unexpected ROAS chart response");
      return { status: "ready" as const, updatedAt: now.toISOString(), days,
        campaigns: campaignDays(chart, days), organic: organicDays(facts.installs, facts.events, facts.attributes, days, now.getTime()) };
    }, { maxAgeMs: 5 * 60_000 });
  } catch (error) {
    console.error("tap_and_swipe.versy_meta_roas_failed", error instanceof Error ? error.message : "Unknown error");
    return { status: "unavailable", updatedAt: now.toISOString(), days, campaigns: {}, organic: {} };
  }
}
