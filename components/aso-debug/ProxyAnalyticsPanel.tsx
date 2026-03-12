"use client";

import { useState, useEffect, useCallback } from "react";

interface AnalyticsRow {
  bucket: string;
  requests: number;
  unique_licenses: number;
  rate_limits_global: number;
  rate_limits_auth: number;
  rate_limits_license: number;
  rate_limits_suggestions: number;
  cache_hits: number;
  cache_misses: number;
  dedup_hits: number;
  upstream_requests: number;
  sem_amp_peak_active: number;
  sem_amp_peak_queued: number;
  sem_itunes_peak_active: number;
  sem_itunes_peak_queued: number;
}

interface AnalyticsSummary {
  requests: number;
  uniqueLicenses: number;
  rateLimits: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: number;
  rateLimitsGlobal: number;
  rateLimitsAuth: number;
  rateLimitsLicense: number;
  rateLimitsSuggestions: number;
  semAmpPeakActive: number;
  semAmpPeakQueued: number;
  semItunesPeakActive: number;
  semItunesPeakQueued: number;
}

interface AnalyticsData {
  period: string;
  granMinutes: number;
  summary: AnalyticsSummary;
  timeseries: AnalyticsRow[];
}

type Period = "1h" | "6h" | "24h" | "7d" | "30d";

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#c9c4bc]/60">{label}</p>
      <p className="mt-1 text-xl font-bold text-[#f4cf8f]">{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-[#c9c4bc]/40">{sub}</p>}
    </div>
  );
}

function SemaphoreGauge({ label, peakActive, peakQueued, max }: { label: string; peakActive: number; peakQueued: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (peakActive / max) * 100) : 0;
  const full = peakActive >= max;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <p className="text-xs text-[#c9c4bc]">
          <span className="font-mono text-[#f4cf8f]">{peakActive}/{max}</span>{" "}
          {label}
          {peakQueued > 0 && <span className="text-[#c9c4bc]/40"> +{peakQueued} queued</span>}
        </p>
        {full && <span className="text-[10px] text-red-400 font-semibold">SATURATED</span>}
      </div>
      <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${full ? "bg-red-400" : "bg-[#f4cf8f]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ProxyAnalyticsPanel() {
  const [period, setPeriod] = useState<Period>("24h");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/aso/analytics?period=${period}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
    const iv = setInterval(fetchAnalytics, 60_000);
    return () => clearInterval(iv);
  }, [fetchAnalytics]);

  const periods: Period[] = ["1h", "6h", "24h", "7d", "30d"];

  if (loading && !data) return <p className="text-sm text-[#c9c4bc]/60">Loading proxy analytics...</p>;
  if (!data) return <p className="text-sm text-[#c9c4bc]/60">No proxy analytics data yet.</p>;

  const { summary: s, timeseries } = data;
  const maxReq = Math.max(1, ...timeseries.map((r) => r.requests));
  const maxRL = Math.max(1, ...timeseries.map((r) => r.rate_limits_global + r.rate_limits_auth + r.rate_limits_license + r.rate_limits_suggestions));

  function fmtTime(iso: string) {
    const d = new Date(iso);
    if (period === "7d" || period === "30d") return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }

  const AMP_MAX = 8;
  const ITUNES_MAX = 20;

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
              period === p ? "bg-[#f4cf8f] text-[#2a2725]" : "bg-white/5 text-[#c9c4bc] hover:bg-white/10"
            }`}
          >
            {p}
          </button>
        ))}
        {loading && <span className="ml-2 self-center text-xs text-[#c9c4bc]/40">updating...</span>}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard label="Total Requests" value={s.requests.toLocaleString()} />
        <SummaryCard label="Rate Limits" value={s.rateLimits.toLocaleString()} sub={`G:${s.rateLimitsGlobal} A:${s.rateLimitsAuth} L:${s.rateLimitsLicense} S:${s.rateLimitsSuggestions}`} />
        <SummaryCard label="Unique Licenses" value={String(s.uniqueLicenses)} />
        <SummaryCard label="Cache Hit Rate" value={`${s.cacheHitRate}%`} sub={`${s.cacheHits.toLocaleString()} hits / ${(s.cacheHits + s.cacheMisses).toLocaleString()} total`} />
      </div>

      {/* Request volume chart */}
      <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
        <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#c9c4bc]/60">Request Volume</h4>
        {timeseries.length === 0 ? (
          <p className="text-sm text-[#c9c4bc]/40">No data in this period</p>
        ) : (
          <div className="flex items-end gap-[2px]" style={{ height: 120 }}>
            {timeseries.map((r, i) => {
              const h = (r.requests / maxReq) * 100;
              return (
                <div key={i} className="group relative flex-1 min-w-[2px]" style={{ height: "100%" }}>
                  <div className="absolute bottom-0 w-full rounded-t bg-[#f4cf8f] transition-all hover:bg-[#f4cf8f]/80" style={{ height: `${Math.max(h, 1)}%` }} />
                  <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#1a1917] px-2 py-1 text-[10px] text-[#f1ebe2] shadow group-hover:block">
                    {r.requests} req &middot; {fmtTime(r.bucket)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-2 flex justify-between text-[10px] text-[#c9c4bc]/40">
          {timeseries.length > 0 && (
            <>
              <span>{fmtTime(timeseries[0].bucket)}</span>
              <span>{fmtTime(timeseries[timeseries.length - 1].bucket)}</span>
            </>
          )}
        </div>
      </div>

      {/* Rate limits chart */}
      {s.rateLimits > 0 && (
        <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
          <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#c9c4bc]/60">Rate Limits Over Time</h4>
          <div className="flex items-end gap-[2px]" style={{ height: 80 }}>
            {timeseries.map((r, i) => {
              const total = r.rate_limits_global + r.rate_limits_auth + r.rate_limits_license + r.rate_limits_suggestions;
              const h = (total / maxRL) * 100;
              const pctG = total > 0 ? (r.rate_limits_global / total) * 100 : 0;
              const pctA = total > 0 ? (r.rate_limits_auth / total) * 100 : 0;
              const pctL = total > 0 ? (r.rate_limits_license / total) * 100 : 0;
              const pctS = total > 0 ? (r.rate_limits_suggestions / total) * 100 : 0;
              return (
                <div key={i} className="group relative flex-1 min-w-[2px]" style={{ height: "100%" }}>
                  <div className="absolute bottom-0 w-full flex flex-col-reverse rounded-t overflow-hidden" style={{ height: `${Math.max(h, total > 0 ? 2 : 0)}%` }}>
                    {pctG > 0 && <div className="w-full bg-red-400" style={{ height: `${pctG}%` }} />}
                    {pctA > 0 && <div className="w-full bg-orange-400" style={{ height: `${pctA}%` }} />}
                    {pctL > 0 && <div className="w-full bg-yellow-400" style={{ height: `${pctL}%` }} />}
                    {pctS > 0 && <div className="w-full bg-blue-400" style={{ height: `${pctS}%` }} />}
                  </div>
                  <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#1a1917] px-2 py-1 text-[10px] text-[#f1ebe2] shadow group-hover:block">
                    {total} limits &middot; {fmtTime(r.bucket)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-[#c9c4bc]/60">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-red-400" /> Global</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-orange-400" /> Auth</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-yellow-400" /> License</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-blue-400" /> Suggestions</span>
          </div>
        </div>
      )}

      {/* Semaphore load */}
      <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
        <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#c9c4bc]/60">Proxy / Semaphore Load</h4>
        <div className="grid grid-cols-2 gap-6">
          <SemaphoreGauge label="amp-api-edge" peakActive={s.semAmpPeakActive} peakQueued={s.semAmpPeakQueued} max={AMP_MAX} />
          <SemaphoreGauge label="itunes.apple.com" peakActive={s.semItunesPeakActive} peakQueued={s.semItunesPeakQueued} max={ITUNES_MAX} />
        </div>
        {timeseries.length > 0 && (
          <div className="mt-6">
            <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#c9c4bc]/40">Semaphore Peak Active Over Time</h4>
            <div className="flex items-end gap-[2px]" style={{ height: 60 }}>
              {timeseries.map((r, i) => {
                const ampPct = (r.sem_amp_peak_active / AMP_MAX) * 100;
                const itunesPct = (r.sem_itunes_peak_active / ITUNES_MAX) * 100;
                const maxPct = Math.max(ampPct, itunesPct);
                return (
                  <div key={i} className="group relative flex-1 min-w-[2px]" style={{ height: "100%" }}>
                    <div className="absolute bottom-0 w-full rounded-t bg-[#f4cf8f]/50" style={{ height: `${Math.max(maxPct, 1)}%` }} />
                    <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#1a1917] px-2 py-1 text-[10px] text-[#f1ebe2] shadow group-hover:block">
                      amp:{r.sem_amp_peak_active}/{AMP_MAX} itunes:{r.sem_itunes_peak_active}/{ITUNES_MAX}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
