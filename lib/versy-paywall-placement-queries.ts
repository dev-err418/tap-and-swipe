import "server-only";
import { appAnalyticsPeriodRange } from "./app-analytics-time";
import { summarizeVersyPlacements, type VersyPlacementEvent, type VersyPlacementReport } from "./versy-paywall-placements";

const MAX_GROUPS = 20_000;
const cache = new Map<string, { expiresAt: number; report: VersyPlacementReport }>();

function sqlTime(date: Date) { return date.toISOString().slice(0, 19).replace("T", " "); }
function count(value: unknown) { const n = Number(value); return Number.isFinite(n) && n >= 0 ? n : 0; }

export async function getVersyPaywallPlacements(): Promise<VersyPlacementReport> {
  const { since, before } = appAnalyticsPeriodRange("month");
  const base = summarizeVersyPlacements([], since.toISOString(), before.toISOString());
  const key = process.env.POSTHOG_VERSY_READ_KEY?.trim();
  const projectId = process.env.POSTHOG_VERSY_PROJECT_ID?.trim();
  const superwallKey = process.env.SUPERWALL_VERSY_API_KEY?.trim();
  if (!key || !projectId || !/^\d+$/.test(projectId) || !superwallKey) {
    return { ...base, status: "setup_required", note: "Versy paywall reporting access is not configured." };
  }
  const cached = cache.get(projectId);
  if (cached && cached.expiresAt > Date.now()) return cached.report;
  const host = process.env.POSTHOG_VERSY_REGION === "us" ? "https://us.posthog.com" : "https://eu.posthog.com";
  const sql = `SELECT distinct_id, placement,
      countIf(event = 'paywall_reached') AS reaches,
      countIf(event = 'paywall_viewed') AS views,
      countIf(event = 'paywall_purchase_attempted') AS attempts,
      countIf(event = 'paywall_purchase_result' AND result = 'purchased') AS purchases,
      minIf(toUnixTimestamp(timestamp), event = 'paywall_viewed') AS first_view,
      maxIf(toUnixTimestamp(timestamp), event = 'paywall_purchase_result' AND result = 'purchased') AS last_purchase
    FROM (
      SELECT distinct_id, event, timestamp, toString(properties.placement) AS placement,
        toString(properties.result) AS result
      FROM events
      WHERE timestamp >= toDateTime('${sqlTime(since)}', 'UTC')
        AND timestamp < toDateTime('${sqlTime(before)}', 'UTC')
        AND event IN ('paywall_reached', 'paywall_viewed', 'paywall_purchase_attempted', 'paywall_purchase_result')
        AND properties.app_environment = 'production'
    )
    WHERE notEmpty(placement)
    GROUP BY distinct_id, placement
    LIMIT ${MAX_GROUPS + 1}`;
  try {
    const response = await fetch(`${host}/api/projects/${projectId}/query/`, {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query: sql } }),
      signal: AbortSignal.timeout(25_000), cache: "no-store",
    });
    if (!response.ok) throw new Error(`PostHog query returned HTTP ${response.status}`);
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !Array.isArray((data as { results?: unknown }).results)) throw new Error("Invalid PostHog result");
    const results = (data as { results: unknown[][] }).results;
    if (results.length > MAX_GROUPS) return { ...base, status: "limited", note: "Too many placement records to report reliably." };
    const assignmentSql = `SELECT appUserId, value FROM sw.user_attributes_rep FINAL
      WHERE applicationId = 51393 AND isSandbox = 0 AND isDeleted = 0 AND ts < now()
        AND key = 'onboarding_variant'
      LIMIT 30001 FORMAT JSON`;
    const assignmentResponse = await fetch("https://api.superwall.com/v2/organizations/25476/query", {
      method: "POST", headers: { Authorization: `Bearer ${superwallKey}`, "Content-Type": "text/plain" },
      body: assignmentSql, signal: AbortSignal.timeout(25_000), cache: "no-store",
    });
    if (!assignmentResponse.ok) throw new Error(`Superwall query returned HTTP ${assignmentResponse.status}`);
    const assignmentData: unknown = await assignmentResponse.json();
    if (!assignmentData || typeof assignmentData !== "object" || !Array.isArray((assignmentData as { data?: unknown }).data)) {
      throw new Error("Invalid Superwall assignment result");
    }
    const assignmentRows = (assignmentData as { data: { appUserId: string; value: string }[] }).data;
    if (assignmentRows.length > 30_000) return { ...base, status: "limited", note: "Too many onboarding assignments to report reliably." };
    const onboardingVariant = new Map(assignmentRows.map((row) => [row.appUserId, row.value]));
    const events: VersyPlacementEvent[] = results.map((row) => ({
      userId: String(row[0] ?? ""), placement: String(row[1] ?? ""), onboardingVariant: onboardingVariant.get(String(row[0] ?? "")),
      reaches: count(row[2]), views: count(row[3]),
      attempts: count(row[4]), purchases: count(row[5]), firstView: count(row[6]), lastPurchase: count(row[7]),
    }));
    const report = summarizeVersyPlacements(events, base.windowStart, base.windowEnd);
    cache.set(projectId, { expiresAt: Date.now() + 90_000, report });
    return report;
  } catch (error) {
    console.error("tap_and_swipe.versy_paywall_placements_failed", { error: error instanceof Error ? error.message : String(error) });
    return { ...base, status: "unavailable", note: "Versy placement analytics could not be loaded. Refresh to retry." };
  }
}
