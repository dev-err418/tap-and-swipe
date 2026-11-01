import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AppleAdsKeywordReport, AppleAdsKeywordRow } from "./apple-ads-keyword-analytics";
import { realizedKeywordRoas } from "./apple-ads-keyword-roas";

type Config = { clientId: string; teamId: string; keyId: string; orgId: string; privateKey: string };
type SpendRow = { campaignId: string; keyword: string; country: string; amount: number; currency: string };
type AppleRow = { metadata?: { campaignId?: number; keyword?: string; countryOrRegion?: string }; total?: { localSpend?: { amount?: string; currency?: string } } };
const DAY = 86_400_000;
const localConfig = "/Users/arthur/Library/Application Support/AppSprintASO/apple-ads-keys-2026-10-18/connection.json";
const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
const date = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const keyOf = (campaign: string, keyword: string) => `${campaign}|${keyword.trim().replace(/\s+/g, " ").normalize("NFKC").toLowerCase()}`;

async function config(): Promise<Config | null> {
  const { APPLE_ADS_CLIENT_ID: clientId, APPLE_ADS_TEAM_ID: teamId, APPLE_ADS_KEY_ID: keyId,
    APPLE_ADS_ORG_ID: orgId, APPLE_ADS_PRIVATE_KEY: privateKey } = process.env;
  if (clientId && teamId && keyId && orgId && privateKey) return { clientId, teamId, keyId, orgId, privateKey: privateKey.replace(/\\n/g, "\n") };
  if (process.env.NODE_ENV === "production") return null;
  try {
    const settings = JSON.parse(await readFile(localConfig, "utf8"));
    const key = await readFile(path.join(path.dirname(localConfig), settings.privateKeyFile), "utf8");
    return { clientId: settings.clientId, teamId: settings.teamId, keyId: settings.keyId, orgId: String(settings.orgId), privateKey: key };
  } catch { return null; }
}

async function accessToken(settings: Config): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = `${encode({ alg: "ES256", kid: settings.keyId })}.${encode({ iss: settings.teamId, sub: settings.clientId,
    aud: "https://appleid.apple.com", iat: now, exp: now + 3600 })}`;
  const signer = createSign("SHA256"); signer.update(payload); signer.end();
  const secret = `${payload}.${signer.sign({ key: settings.privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url")}`;
  const response = await fetch("https://appleid.apple.com/auth/oauth2/token", { method: "POST", cache: "no-store", signal: AbortSignal.timeout(20_000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "client_credentials",
      client_id: settings.clientId, client_secret: secret, scope: "searchadsorg" }) });
  if (!response.ok) throw new Error(`Apple Ads authentication failed (${response.status})`);
  const result = await response.json();
  if (typeof result.access_token !== "string") throw new Error("Apple Ads authentication returned no token");
  return result.access_token;
}

async function usdPerEuro(): Promise<number | null> {
  try {
    const response = await fetch("https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml", { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return null;
    const rate = Number((await response.text()).match(/currency=['"]USD['"]\s+rate=['"]([\d.]+)['"]/)?.[1]);
    return Number.isFinite(rate) && rate > 0 ? rate : null;
  } catch { return null; }
}

async function campaignSpend(settings: Config, token: string, campaign: string, start: number, end: number): Promise<SpendRow[]> {
  if (end <= start) return [];
  const rows: SpendRow[] = [];
  for (let offset = 0; offset < 20_000; offset += 1000) {
    const response = await fetch(`https://api.searchads.apple.com/api/v5/reports/campaigns/${campaign}/keywords`, {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(30_000),
      headers: { Authorization: `Bearer ${token}`, "X-AP-Context": `orgId=${settings.orgId}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startTime: date(start), endTime: date(end - 1), timeZone: "UTC", groupBy: ["countryOrRegion"],
        returnRecordsWithNoMetrics: false, returnRowTotals: true, returnGrandTotals: false,
        selector: { conditions: [{ field: "deleted", operator: "IN", values: ["false", "true"] },
          { field: "adGroupDeleted", operator: "IN", values: ["false", "true"] }],
        orderBy: [{ field: "impressions", sortOrder: "DESCENDING" }], pagination: { offset, limit: 1000 } } }),
    });
    if (!response.ok) throw new Error(`Apple Ads keyword report failed (${response.status})`);
    const result = await response.json();
    if (result.error || !Array.isArray(result.data?.reportingDataResponse?.row)) throw new Error("Invalid Apple Ads keyword report");
    const page: AppleRow[] = result.data.reportingDataResponse.row;
    for (const item of page) {
      const meta = item.metadata, spend = item.total?.localSpend;
      const amount = Number(spend?.amount);
      if (!meta?.keyword || !spend?.currency || !Number.isFinite(amount)) throw new Error("Incomplete Apple Ads keyword spend");
      rows.push({ campaignId: campaign, keyword: meta.keyword, country: meta.countryOrRegion || "unknown", amount, currency: spend.currency });
    }
    if (page.length < 1000) return rows;
  }
  throw new Error("Apple Ads keyword report exceeds pagination limit");
}

/** Daily UTC spend includes taps that never installed; rates use the latest ECB reference rate. */
export async function addAppleKeywordSpend(report: AppleAdsKeywordReport,
  startMs: number, endMs: number, campaignIds: string[]): Promise<AppleAdsKeywordReport> {
  const settings = await config();
  if (!settings) return report;
  try {
    const token = await accessToken(settings);
    const [fx, results] = await Promise.all([usdPerEuro(), Promise.allSettled(campaignIds.map((campaign) =>
      campaignSpend(settings, token, campaign, startMs, endMs)))]);
    const success = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    const costs = success.flat();
    const convert = (amount: number, currency: string) => currency === "USD" ? amount : currency === "EUR" && fx != null ? amount * fx : null;
    function add(rows: AppleAdsKeywordRow[], country?: string): AppleAdsKeywordRow[] {
      const relevant = costs.filter((entry) => !country || entry.country === country);
      const result = rows.map((row) => ({ ...row }));
      for (const entry of relevant) {
        const key = keyOf(entry.campaignId, entry.keyword);
        if (!result.some((row) => row.key === key)) result.push({ key, keyword: entry.keyword, campaignId: entry.campaignId,
          keywordIds: [], users: 0, trials: 0, finishedTrials: 0, convertedTrials: 0, paidUsers: 0, proceeds: 0, missingMoney: false });
      }
      for (const row of result) {
        if (row.key.includes("|id:") || row.campaignId === "unknown") continue;
        const matches = relevant.filter((entry) => keyOf(entry.campaignId, entry.keyword) === row.key);
        if (!matches.length) continue;
        const currencies = new Set(matches.map((entry) => entry.currency));
        if (currencies.size !== 1) continue;
        row.spendCurrency = matches[0].currency;
        row.spend = matches.reduce((sum, entry) => sum + entry.amount, 0);
        row.spendUsd = convert(row.spend, row.spendCurrency);
        row.realizedRoas = realizedKeywordRoas(row);
      }
      return result.sort((a, b) => b.users - a.users || (b.spend ?? 0) - (a.spend ?? 0));
    }
    const countries = new Set([...Object.keys(report.countries), ...costs.map((entry) => entry.country)]);
    return { ...report, rows: add(report.rows), countries: Object.fromEntries([...countries].map((country) => [country,
      add(report.countries[country] ?? [], country)])) };
  } catch (error) {
    console.error("apple_ads_keyword_spend_unavailable", error instanceof Error ? error.message : "unknown error");
    return report;
  }
}

export const keywordUtcStart = (ms: number) => Math.floor(ms / DAY) * DAY;
