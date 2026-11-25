import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { analyticsSnapshot } from "./analytics-snapshot";
import { getVersyAcquisitionFacts } from "./mobile-app-analytics";
import { organicDays, roasDays } from "./versy-meta-roas";
import { fetchVersyCampaignDays } from "./versy-meta-roas-queries";
import { DAYS, type Campaign, type Report } from "./versy-acquisition-report";
import { buildTrend, fetchCohorts, fetchDelivery, parisDay, shift, type Cohort, type Delivery } from "./versy-meta-delivery";

// Last verified AppSprint inventory, also used during a Meta authorization outage.
const knownCampaigns: Campaign[] = [
  ["120255033133290450", "US - Web Trials - Versy - Maximize"],
  ["120255309089760450", "US - Trials - Versy"],
  ["120255328753620450", "FR - iOS - Trials - Versy"],
  ["120255328782510450", "DE - Trials - Versy"],
  ["120255385345590450", "FR - Qualified Trials (2h) - Versy"],
  ["120255534469740450", "FR - iOS - Initial Conv (30m) - Versy"],
  ["120255552638450450", "FR - Android - Initial Conv (30m) - Versy"],
  ["120255574973160450", "ES - iOS - Initial Conv - Versy"],
  ["120255581722590450", "FR - iOS - Initial Conv - Versy"],
].map(([id, label]) => ({ id, label, country: label.slice(0, 2), platform: label.includes("Android") ? "android" : "ios" }));

function deliveredDays(rows: Delivery[]) {
  const sets = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row.spend <= 0) continue;
    const days = sets.get(row.cid) ?? new Set<string>();
    days.add(row.day);
    sets.set(row.cid, days);
  }
  return Object.fromEntries([...sets].map(([id, days]) => [id, [...days]]));
}

async function sideReport(now: Date): Promise<Report | null> {
  // The local dashboards can share the producer's atomically replaced snapshot.
  const file = process.env.VERSY_ACQUISITION_SNAPSHOT || (process.env.NODE_ENV !== "production"
    ? path.resolve(process.cwd(), "../apps/versy-app/analytics-dashboard/.cache/snapshot.json") : null);
  if (!file) return null;
  try {
    const data = JSON.parse(await readFile(file, "utf8")) as {
      schema: number; today: string; updatedAt: string; metaThrough: string | null; metaError: string | null;
      cohorts: Cohort[]; totals: Delivery[]; markets: Delivery[];
      dailyRoas: Pick<Report, "days" | "organic" | "campaigns"> & { updatedAt: string };
    };
    if (data.schema !== 2 || data.today !== parisDay(now) || !data.dailyRoas ||
        [data.updatedAt, data.dailyRoas.updatedAt].some(t => !(now.getTime() - Date.parse(t) < 600000))) return null;
    const { days, organic, campaigns } = data.dailyRoas;
    return { days, organic, campaigns, snapshotUpdatedAt: data.updatedAt, tablesAvailable: true, delivery: deliveredDays(data.totals),
      trend: buildTrend(data.today, data.cohorts, data.totals, data.markets, data.metaThrough, Boolean(data.metaError)) };
  } catch { return null; }
}

export async function getVersyMetaRoas(): Promise<Report> {
  const now = new Date();
  const local = await sideReport(now);
  if (local) return local;
  const days = roasDays(now).slice(-DAYS), today = parisDay(now);
  const key = process.env.SUPERWALL_VERSY_API_KEY?.trim();
  const delivery = await fetchDelivery(shift(today, -29), today).catch(() => null);
  const inventory = new Map(knownCampaigns.map(c => [c.id, c]));
  for (const r of delivery?.totals ?? []) inventory.set(r.cid, { id: r.cid, label: r.campaign, country: r.targetMarket, platform: r.platform });
  const deliveryDays = deliveredDays(delivery?.totals ?? []);
  const [tables, chart] = await Promise.all([
    analyticsSnapshot(`versy-roas-ledger-both-v1:${days.at(-1)!.date}`, async () => {
      if (!key) throw new Error("Superwall unavailable");
      return { parts: await Promise.all(([51393, 58115] as const).map(async app => {
        const campaigns = [...inventory.values()].filter(c => (c.platform === "android") === (app === 58115));
        const markets = [...new Set(campaigns.map(c => c.country))].map(code => ({ code, campaigns: campaigns.filter(c => c.country === code) }));
        const [values, facts] = await Promise.all([fetchVersyCampaignDays(key, days, now.toISOString(), fetch, app, markets),
          getVersyAcquisitionFacts(days[0].date + "T00:00:00Z", now.toISOString(), app)]);
        return { campaigns: campaigns.map(c => ({ ...c, values: values[c.id] })),
          organic: organicDays(facts.installs, facts.events, facts.attributes, days, now.getTime(), markets) };
      })) };
    }, { maxAgeMs: 300000 }).catch(() => null),
    analyticsSnapshot(`versy-roas-paris-cohorts-v1:${today}`, async () => {
      if (!key) throw new Error("Superwall unavailable");
      return { rows: await fetchCohorts(key, shift(today, -20), today) };
    }, { maxAgeMs: 300000 }).catch(() => null),
  ]);
  const stamps = [tables?.snapshotUpdatedAt, chart?.snapshotUpdatedAt, delivery?.snapshotUpdatedAt];
  const snapshotUpdatedAt = stamps.every((s): s is string => !!s) ? stamps.sort()[0] : undefined;
  return { days, snapshotUpdatedAt, campaigns: tables?.parts.flatMap(p => p.campaigns) ?? [], organic: tables?.parts.map(p => p.organic) ?? [],
    delivery: deliveryDays, tablesAvailable: !!tables,
    trend: buildTrend(today, chart?.rows ?? [], delivery?.totals ?? [], delivery?.markets ?? [], delivery?.metaThrough ?? null,
      !delivery || now.getTime() - delivery.verifiedAt > 300000) };
}
