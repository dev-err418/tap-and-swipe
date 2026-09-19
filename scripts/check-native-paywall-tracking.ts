/** Read-only smoke check. Prints aggregate health only, never tokens or user records. */
import { config } from "dotenv";
import { loadNativePaywalls } from "../lib/native-paywall-queries";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

async function main() {
  for (const [app, organization, application] of [["POKY", 16256, 49771], ["GLOW", 27020, 54736]] as const) {
    const token = process.env[`SUPERWALL_${app}_API_KEY`];
    if (!token) throw new Error(`${app}: missing backend API credential`);
    const query = async <T>(sql: string): Promise<T[]> => {
      const response = await fetch(`https://api.superwall.com/v2/organizations/${organization}/query`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "text/plain" },
        body: sql, signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`${app}: query HTTP ${response.status}`);
      const result = await response.json() as { data?: T[] };
      if (!Array.isArray(result.data)) throw new Error(`${app}: invalid query response`);
      return result.data;
    };
    const report = await loadNativePaywalls(query, application, Date.parse("2026-01-01T00:00:00Z"), Date.now());
    const money = await query<{ name: string; events: string; linkedUsers: string; amounts: string }>(`
SELECT name, count() AS events, countIf(appUserId IS NOT NULL AND appUserId != '') AS linkedUsers,
  countIf(proceeds IS NOT NULL) AS amounts
FROM open_revenue.attributed_events_by_ts_rep FINAL
WHERE applicationId = ${application} AND isSandbox = 0 AND source = 'integration'
  AND ts >= now() - INTERVAL 7 DAY AND ts < now()
  AND name IN ('initial_purchase', 'renewal', 'cancellation')
GROUP BY name LIMIT 10 FORMAT JSON`);
    console.log(JSON.stringify({ app, status: report.status, warnings: report.warnings,
      cohorts: report.groups.filter((g) => g.language !== "all").map((g) => ({ experiment: g.experiment, language: g.language,
        users: g.paywalls.reduce((n, r) => n + r.users, 0), views: g.paywalls.reduce((n, r) => n + r.views, 0),
        conversions: g.paywalls.reduce((n, r) => n + r.conversions, 0) })), serverRevenueLast7Days: money }, null, 2));
    if (report.status !== "ready") process.exitCode = 1;
  }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Tracking check failed"); process.exitCode = 1; });
