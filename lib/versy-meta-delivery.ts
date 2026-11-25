import "server-only";
import { analyticsSnapshot } from "./analytics-snapshot";
import { blendedCohortQuery } from "./versy-blended-cohorts";
import { multiple, type TrendPoint } from "./versy-acquisition-report";

export type Delivery = { day: string; cid: string; campaign: string; targetMarket: string; platform: string; spend: number; market?: string };
export type Cohort = { day: string; country: string; installs: number; missing_money: number; booked: number };
export const shift = (day: string, n: number) => new Date(Date.parse(day) + n * 86400000).toISOString().slice(0, 10);
export const parisDay = (now: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(now);

export async function fetchDelivery(since: string, today: string) {
  const token = process.env.META_ACCESS_TOKEN?.trim();
  const load = async (byCountry: boolean) => {
    if (!token) throw new Error("AppSprint Meta token unavailable");
    const url = new URL("https://graph.facebook.com/v25.0/act_1511233599015794/insights");
    url.search = new URLSearchParams({ fields: "date_start,campaign_id,campaign_name,account_currency,spend",
      level: "campaign", time_increment: "1", limit: "500", time_range: JSON.stringify({ since, until: today }),
      ...(byCountry ? { breakdowns: "country" } : {}) }).toString();
    const rows: Delivery[] = [];
    const seen = new Set<string>();
    while (true) {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(25000) });
      if (!response.ok) throw new Error("AppSprint delivery unavailable");
      const page = await response.json();
      if (!Array.isArray(page.data)) throw new Error("Incomplete Meta delivery");
      for (const r of page.data) {
        if (!/\bversy\b/i.test(r.campaign_name)) continue;
        if (r.account_currency !== "EUR" || !r.campaign_id || r.spend == null || !Number.isFinite(Number(r.spend))) throw new Error("Invalid Meta delivery");
        rows.push({ day: r.date_start, cid: r.campaign_id, campaign: r.campaign_name, spend: Number(r.spend),
          targetMarket: /^[A-Z]{2}(?=\s*-)/.exec(r.campaign_name)?.[0] ?? "ZZ",
          platform: /\bandroid\b/i.test(r.campaign_name) ? "android" : "ios", market: r.country?.toUpperCase() });
      }
      if (!page.paging?.next) return rows;
      const after = page.paging.cursors?.after;
      if (!after || seen.has(after)) throw new Error("Incomplete Meta pagination");
      url.searchParams.set("after", after);
      seen.add(after);
    }
  };
  // A stable key lets a failed refresh retain verified days across midnight.
  return analyticsSnapshot("versy-eur-meta-delivery-v1", async () => {
    const [totals, markets] = await Promise.all([load(false), load(true)]);
    return { totals, markets, metaThrough: today, verifiedAt: Date.now() };
  }, { maxAgeMs: 300000 });
}

export async function fetchCohorts(key: string, since: string, today: string): Promise<Cohort[]> {
  const url = new URL("https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A");
  url.search = new URLSearchParams({ startPeriod: shift(since, -8), endPeriod: today, format: "csvdata" }).toString();
  const [data, fx] = await Promise.all([
    fetch("https://api.superwall.com/v2/organizations/25476/query", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "text/plain" },
      cache: "no-store", body: blendedCohortQuery(since), signal: AbortSignal.timeout(60000) }),
    fetch(url, { signal: AbortSignal.timeout(20000) }),
  ]);
  if (!data.ok || !fx.ok) throw new Error("Unavailable cohort proceeds or exchange rates");
  const result = await data.json();
  if (result.exception || !Array.isArray(result.data) || result.rows !== result.data.length || result.rows >= 50000) throw new Error("Incomplete cohort proceeds");
  const [header, ...lines] = (await fx.text()).trim().split(/\r?\n/);
  const fields = header.split(",");
  const rates = new Map(lines.map(line => {
    const cols = line.split(",");
    return [cols[fields.indexOf("TIME_PERIOD")], Number(cols[fields.indexOf("OBS_VALUE")])] as const;
  }));
  let last = 0;
  for (let day = shift(since, -8); day <= today; day = shift(day, 1)) {
    last = rates.get(day) || last;
    if (day >= since && last <= 0) throw new Error("Missing exchange rate");
    rates.set(day, last);
  }
  return result.data.map((row: Cohort & { booked_usd: string }) => ({ day: row.day, country: row.country,
    installs: Number(row.installs), missing_money: Number(row.missing_money), booked: Number(row.booked_usd) / rates.get(row.day)! }));
}

export function buildTrend(today: string, cohorts: Cohort[], totals: Delivery[], markets: Delivery[], through: string | null, stale: boolean) {
  const codes = new Set(["all", ...cohorts.map(r => r.country), ...markets.map(r => r.market ?? "ZZ")]);
  const trend: Record<string, TrendPoint[]> = {};
  for (const code of codes) {
    const ads = code === "all" ? totals : markets.filter(r => r.market === code);
    const rows = code === "all" ? cohorts : cohorts.filter(r => r.country === code);
    trend[code] = Array.from({ length: 21 }, (_, i) => {
      const date = shift(today, i - 20);
      const installs = rows.filter(r => r.day === date);
      const spend = through && date <= through ? ads.reduce((sum, r) => r.day === date ? sum + r.spend : sum, 0) : null;
      const proceeds = installs.length && !installs.some(r => r.missing_money > 0) ? installs.reduce((n, r) => n + r.booked, 0) : null;
      const incomplete = !through || date > through || (stale && date === through);
      return { date, spend, proceeds, roas: incomplete ? null : multiple({ spend, proceeds }), incomplete };
    });
  }
  return trend;
}
