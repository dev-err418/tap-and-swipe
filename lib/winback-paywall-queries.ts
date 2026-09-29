import "server-only";
import { appAnalyticsPeriodRange } from "./app-analytics-time";
import { summarizeWinbackPaywall, type WinbackPaywallReport } from "./winback-paywall-analytics";

type AppId = "glow" | "versy";
const HOST = "https://eu.posthog.com";
const MAX_GROUPS = 20_000;
const cache = new Map<string, { expiresAt: number; report: WinbackPaywallReport }>();
const inflight = new Map<string, Promise<WinbackPaywallReport>>();

function sqlTime(date: Date): string { return date.toISOString().slice(0, 19).replace("T", " "); }
function text(value: unknown): string { return String(value ?? ""); }
function number(value: unknown): number { const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : 0; }

async function load(appId: AppId): Promise<WinbackPaywallReport> {
  const { since, before } = appAnalyticsPeriodRange("month");
  const base = summarizeWinbackPaywall([], since.toISOString(), before.toISOString());
  const prefix = appId === "glow" ? "GLOW" : "VERSY";
  const key = process.env[`POSTHOG_${prefix}_READ_KEY`]?.trim();
  const projectId = process.env[`POSTHOG_${prefix}_PROJECT_ID`]?.trim();
  if (!key || !projectId || !/^\d+$/.test(projectId)) {
    return { ...base, status: "setup_required", note: `${appId === "glow" ? "Glow" : "Versy"} PostHog read access is not configured.` };
  }
  // Glow's discounted SKU is recorded as original_product_id on purchase. Versy uses
  // a promotional offer on the original SKU. Both join to the product shown at view.
  const sql = `SELECT distinct_id, source, product_id,
      countIf(event = 'winback_paywall_viewed') AS views,
      countIf(event = 'winback_purchase_completed') AS purchases,
      minIf(toUnixTimestamp(timestamp), event = 'winback_paywall_viewed') AS first_view,
      maxIf(toUnixTimestamp(timestamp), event = 'winback_purchase_completed') AS last_purchase
    FROM (
      SELECT distinct_id, event, timestamp, toString(properties.source) AS source,
        if(event = 'winback_purchase_completed' AND notEmpty(toString(properties.original_product_id)),
          toString(properties.original_product_id), toString(properties.product_id)) AS product_id
      FROM events
      WHERE timestamp >= toDateTime('${sqlTime(since)}', 'UTC')
        AND timestamp < toDateTime('${sqlTime(before)}', 'UTC')
        AND event IN ('winback_paywall_viewed', 'winback_purchase_completed')
        AND properties.app_environment = 'production'
    )
    GROUP BY distinct_id, source, product_id
    LIMIT ${MAX_GROUPS + 1}`;
  try {
    const response = await fetch(`${HOST}/api/projects/${projectId}/query/`, {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query: sql } }),
      signal: AbortSignal.timeout(25_000), cache: "no-store",
    });
    if (!response.ok) throw new Error(`PostHog query returned HTTP ${response.status}`);
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !Array.isArray((data as { results?: unknown }).results)) throw new Error("Invalid PostHog result");
    const results = (data as { results: unknown[][] }).results;
    if (results.length > MAX_GROUPS) return { ...base, status: "limited", note: "More than 20,000 viewer/product groups. Narrower reporting is needed before showing a reliable conversion rate." };
    const groups = results.map((row) => ({
      userId: text(row[0]), source: text(row[1]).slice(0, 120), productId: text(row[2]).slice(0, 120),
      views: number(row[3]), purchases: number(row[4]), firstView: number(row[5]), lastPurchase: number(row[6]),
    }));
    return summarizeWinbackPaywall(groups, base.windowStart, base.windowEnd);
  } catch (error) {
    console.error("tap_and_swipe.winback_paywall_query_failed", { appId, error: error instanceof Error ? error.message : String(error) });
    return { ...base, status: "unavailable", note: "Offer analytics could not be loaded. Refresh to retry." };
  }
}

export function getWinbackPaywallReport(appId: AppId): Promise<WinbackPaywallReport> {
  const cacheKey = appId;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.report);
  const pending = inflight.get(cacheKey);
  if (pending) return pending;
  const promise = load(appId).then((report) => {
    cache.set(cacheKey, { report, expiresAt: Date.now() + 90_000 });
    inflight.delete(cacheKey);
    return report;
  }, (error) => { inflight.delete(cacheKey); throw error; });
  inflight.set(cacheKey, promise);
  return promise;
}
