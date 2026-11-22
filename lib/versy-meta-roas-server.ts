import "server-only";
import { analyticsSnapshot } from "./analytics-snapshot";
import { getVersyAcquisitionFacts } from "./mobile-app-analytics";
import { organicDays, roasDays, type VersyRoasReport } from "./versy-meta-roas";
import { fetchVersyCampaignDays } from "./versy-meta-roas-queries";

export async function getVersyMetaRoas(): Promise<VersyRoasReport> {
  const now = new Date(), days = roasDays(now);
  try {
    return await analyticsSnapshot(`versy-meta-roas-v5-transaction-ledger:${days.at(-1)!.date}`, async () => {
      const apiKey = process.env.SUPERWALL_VERSY_API_KEY?.trim();
      if (!apiKey) throw new Error("SUPERWALL_VERSY_API_KEY is not configured");
      const from = `${days[0].date}T00:00:00Z`;
      const [campaigns, facts] = await Promise.all([
        fetchVersyCampaignDays(apiKey, days, now.toISOString()),
        getVersyAcquisitionFacts(from, now.toISOString()),
      ]);
      return { status: "ready" as const, updatedAt: now.toISOString(), days,
        campaigns, organic: organicDays(facts.installs, facts.events, facts.attributes, days, now.getTime()) };
    }, { maxAgeMs: 5 * 60_000 });
  } catch (error) {
    console.error("tap_and_swipe.versy_meta_roas_failed", error instanceof Error ? error.message : "Unknown error");
    return { status: "unavailable", updatedAt: now.toISOString(), days, campaigns: {}, organic: {} };
  }
}
