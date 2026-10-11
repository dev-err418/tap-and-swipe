// Shared with the scheduler. Keep inputs finite: no user-supplied cache keys or SQL.
export const ANALYTICS_APPS = ["glow", "poky", "versy"] as const;
export const ANALYTICS_PERIODS = ["day", "yesterday", "3days", "week", "month", "all"] as const;
export type AnalyticsApp = typeof ANALYTICS_APPS[number];
export type AnalyticsPeriod = typeof ANALYTICS_PERIODS[number];
export type AnalyticsRefreshJob = {
  appId: AnalyticsApp;
  kind: "data" | "experiments" | "product" | "winback" | "placements";
  period: AnalyticsPeriod;
};

export function analyticsRefreshJobs(appId: AnalyticsApp): AnalyticsRefreshJob[] {
  return [
    { appId, kind: "experiments", period: "month" },
    ...ANALYTICS_PERIODS.map((period) => ({ appId, kind: "data" as const, period })),
    ...(appId === "poky" ? [] : [
      ...ANALYTICS_PERIODS.map((period) => ({ appId, kind: "product" as const, period })),
      { appId, kind: "winback" as const, period: "month" as const },
    ]),
    ...(appId === "versy" ? [{ appId, kind: "placements" as const, period: "month" as const }] : []),
  ];
}

export function parseAnalyticsRefreshJob(value: unknown): AnalyticsRefreshJob | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (!ANALYTICS_APPS.includes(input.appId as AnalyticsApp)) return null;
  return analyticsRefreshJobs(input.appId as AnalyticsApp).find((job) =>
    job.kind === input.kind && job.period === input.period) ?? null;
}
