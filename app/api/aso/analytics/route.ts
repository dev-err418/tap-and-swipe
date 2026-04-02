import { NextResponse } from "next/server";
import { Pool } from "pg";
import { getSession } from "@/lib/session";

const pool = new Pool({
  connectionString: process.env.ASO_DATABASE_URL,
});

export async function GET(req: Request) {
  const session = await getSession();
  if (session?.discordId !== process.env.ADMIN_DISCORD_ID) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "24h";
  const periodMap: Record<string, number> = {
    "1h": 60,
    "6h": 360,
    "24h": 1440,
    "7d": 10080,
    "30d": 43200,
  };
  const minutes = periodMap[period] || 1440;
  const granMinutes = Math.max(1, Math.floor(minutes / 100));

  const { rows } = await pool.query(
    `
    SELECT
        date_trunc('hour', minute) + (EXTRACT(minute FROM minute)::int / $2) * ($2 || ' minutes')::interval AS bucket,
        SUM(requests)::int AS requests,
        MAX(unique_licenses)::int AS unique_licenses,
        SUM(rate_limits_global)::int AS rate_limits_global,
        SUM(rate_limits_auth)::int AS rate_limits_auth,
        SUM(rate_limits_license)::int AS rate_limits_license,
        SUM(rate_limits_suggestions)::int AS rate_limits_suggestions,
        SUM(cache_hits)::int AS cache_hits,
        SUM(cache_misses)::int AS cache_misses,
        SUM(dedup_hits)::int AS dedup_hits,
        SUM(upstream_requests)::int AS upstream_requests,
        MAX(sem_amp_peak_active)::int AS sem_amp_peak_active,
        MAX(sem_amp_peak_queued)::int AS sem_amp_peak_queued,
        MAX(sem_itunes_peak_active)::int AS sem_itunes_peak_active,
        MAX(sem_itunes_peak_queued)::int AS sem_itunes_peak_queued,
        SUM(token_expired_401s)::int AS token_expired_401s
    FROM aso_analytics
    WHERE minute >= NOW() - ($1 || ' minutes')::interval
    GROUP BY bucket
    ORDER BY bucket
    `,
    [minutes, granMinutes]
  );

  const summary = rows.reduce(
    (acc, r) => {
      acc.requests += r.requests;
      acc.uniqueLicenses = Math.max(acc.uniqueLicenses, r.unique_licenses);
      acc.rateLimits +=
        r.rate_limits_global +
        r.rate_limits_auth +
        r.rate_limits_license +
        r.rate_limits_suggestions;
      acc.cacheHits += r.cache_hits;
      acc.cacheMisses += r.cache_misses;
      acc.rateLimitsGlobal += r.rate_limits_global;
      acc.rateLimitsAuth += r.rate_limits_auth;
      acc.rateLimitsLicense += r.rate_limits_license;
      acc.rateLimitsSuggestions += r.rate_limits_suggestions;
      acc.tokenExpired401s += r.token_expired_401s || 0;
      acc.semAmpPeakActive = Math.max(
        acc.semAmpPeakActive,
        r.sem_amp_peak_active
      );
      acc.semAmpPeakQueued = Math.max(
        acc.semAmpPeakQueued,
        r.sem_amp_peak_queued
      );
      acc.semItunesPeakActive = Math.max(
        acc.semItunesPeakActive,
        r.sem_itunes_peak_active
      );
      acc.semItunesPeakQueued = Math.max(
        acc.semItunesPeakQueued,
        r.sem_itunes_peak_queued
      );
      return acc;
    },
    {
      requests: 0,
      uniqueLicenses: 0,
      rateLimits: 0,
      cacheHits: 0,
      cacheMisses: 0,
      rateLimitsGlobal: 0,
      rateLimitsAuth: 0,
      rateLimitsLicense: 0,
      rateLimitsSuggestions: 0,
      tokenExpired401s: 0,
      semAmpPeakActive: 0,
      semAmpPeakQueued: 0,
      semItunesPeakActive: 0,
      semItunesPeakQueued: 0,
    }
  );

  const totalCacheOps = summary.cacheHits + summary.cacheMisses;
  const cacheHitRate =
    totalCacheOps > 0
      ? Math.round((summary.cacheHits / totalCacheOps) * 1000) / 10
      : 0;

  // Per-license usage data
  const periodDays = Math.max(1, Math.ceil(minutes / 1440));
  const { rows: usageRows } = await pool.query(
    `
    SELECT license_key, SUM(requests)::int as total_requests,
           (array_agg(requests ORDER BY day DESC))[1] as today_requests
    FROM aso_license_usage
    WHERE day >= CURRENT_DATE - ($1 || ' days')::interval
    GROUP BY license_key
    ORDER BY total_requests DESC
    LIMIT 50
    `,
    [periodDays]
  );

  return NextResponse.json({
    period,
    granMinutes,
    summary: { ...summary, cacheHitRate },
    timeseries: rows,
    licenseUsage: usageRows,
  });
}
