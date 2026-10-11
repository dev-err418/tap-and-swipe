import { analyticsRefreshJobs, type AnalyticsApp } from "../../lib/analytics-refresh-jobs";

type Environment = { ANALYTICS_ORIGIN: string; CRON_SECRET: string };
const schedules: Record<string, AnalyticsApp> = {
  "0,30 * * * *": "glow",
  "10,40 * * * *": "poky",
  "20,50 * * * *": "versy",
};

const worker = {
  async scheduled(event: { cron: string }, env: Environment) {
    const appId = schedules[event.cron];
    if (!appId || !env.CRON_SECRET) throw new Error("Analytics scheduler is not configured");
    const origin = new URL(env.ANALYTICS_ORIGIN);
    if (origin.protocol !== "https:") throw new Error("Analytics origin must use HTTPS");
    const url = new URL("/api/cron/analytics-refresh", origin);
    const failures: string[] = [];
    const deadline = Date.now() + 13 * 60_000;
    // Sequential requests avoid flooding the analytics providers. Each app refreshes
    // twice an hour, staggered so their expensive query batches rarely overlap.
    for (const job of analyticsRefreshJobs(appId)) {
      try {
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new Error("Schedule exceeded its time budget");
        const response = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${env.CRON_SECRET}`, "Content-Type": "application/json" },
          body: JSON.stringify(job),
          redirect: "error",
          signal: AbortSignal.timeout(Math.min(110_000, remaining)),
        });
        // Consume every body, but never log report content or credentials.
        await response.arrayBuffer();
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        console.log("analytics_refreshed", job);
      } catch (error) {
        failures.push(`${job.kind}:${job.period}`);
        console.error("analytics_refresh_failed", { ...job, error: error instanceof Error ? error.message : String(error) });
      }
    }
    if (failures.length) throw new Error(`${appId} refresh failed for ${failures.join(", ")}`);
  },
};

export default worker;
