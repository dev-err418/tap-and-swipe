"use client";

import { useState, useEffect, useCallback } from "react";

interface ProxyStat {
  ip: string;
  windowUsed: number;
  windowLimit: number;
  coolingDown: boolean;
  consecutive403: number;
  burned: boolean;
}

interface SemaphoreInfo {
  active: number;
  queued: number;
  max: number;
}

interface QueueInfo {
  maxQueue: number;
  oldestQueuedMs: number;
  peakQueued: number;
}

interface BurnHistoryEntry {
  proxy_ip: string;
  burns: number;
  last_burned: string;
}

interface HealthData {
  status: string;
  upstream: {
    cache: {
      size: number;
      maxSize: number;
      hits: number;
      misses: number;
    };
    dedupHits: number;
    upstreamRequests: number;
    inflight: number;
    concurrency: Record<string, SemaphoreInfo>;
    cooldowns: Record<string, number>;
    itunesProxies: number;
    proxyStats: ProxyStat[];
    queueing?: Record<string, QueueInfo>;
  };
  burnHistory?: BurnHistoryEntry[];
  routes?: Record<string, { active: number; maxActive: number; rejected: number; peakActive: number }>;
}

function StatusBadge({ status }: { status: "healthy" | "cooling" | "burned" }) {
  const colors = {
    healthy: "bg-emerald-400/20 text-emerald-400",
    cooling: "bg-yellow-400/20 text-yellow-400",
    burned: "bg-red-400/20 text-red-400",
  };
  const labels = { healthy: "HEALTHY", cooling: "COOLING", burned: "BURNED" };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

function SemaphoreGauge({ label, active, max }: { label: string; active: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (active / max) * 100) : 0;
  const full = active >= max;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <p className="text-xs text-[#c9c4bc]">
          <span className="font-mono text-[#f4cf8f]">{active}/{max}</span>{" "}
          {label}
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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProxyHealthPanel() {
  const [data, setData] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/aso/health");
      if (res.ok) {
        setData(await res.json());
        setError(null);
      } else {
        setError(`HTTP ${res.status}`);
      }
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const iv = setInterval(fetchHealth, 10_000);
    return () => clearInterval(iv);
  }, [fetchHealth]);

  if (error) return <p className="text-sm text-red-400">Health fetch error: {error}</p>;
  if (!data) return <p className="text-sm text-[#c9c4bc]/60">Loading live health...</p>;

  const { upstream: u, routes, burnHistory } = data;
  const burnedCount = u.proxyStats.filter((p) => p.burned).length;
  const totalHitMiss = u.cache.hits + u.cache.misses;
  const hitRate = totalHitMiss > 0 ? Math.round((u.cache.hits / totalHitMiss) * 1000) / 10 : 0;
  const burnMap = new Map((burnHistory || []).map((b) => [b.proxy_ip, b]));

  return (
    <div className="space-y-4">
      {/* Burn alert */}
      {burnedCount > 0 && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3">
          <p className="text-sm font-bold text-red-400">
            {burnedCount} proxy{burnedCount > 1 ? "ies" : ""} BURNED (403 IP-banned) — auto-recovering in up to 1h
          </p>
        </div>
      )}

      {/* Proxy grid — sorted burned first, collapsed to 2 rows by default */}
      {u.proxyStats.length > 0 && (() => {
        const sorted = [...u.proxyStats].sort((a, b) => {
          if (a.burned !== b.burned) return a.burned ? -1 : 1;
          if (a.coolingDown !== b.coolingDown) return a.coolingDown ? -1 : 1;
          const aBurns = burnMap.get(a.ip)?.burns ?? 0;
          const bBurns = burnMap.get(b.ip)?.burns ?? 0;
          if (aBurns !== bBurns) return bBurns - aBurns;
          return b.windowUsed - a.windowUsed;
        });
        const COLLAPSED_COUNT = 8; // 2 rows × 4 cols
        const shown = expanded ? sorted : sorted.slice(0, COLLAPSED_COUNT);
        const hasMore = sorted.length > COLLAPSED_COUNT;
        return (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {shown.map((p) => {
                const status = p.burned ? "burned" : p.coolingDown ? "cooling" : "healthy";
                const usagePct = p.windowLimit > 0 ? Math.min(100, (p.windowUsed / p.windowLimit) * 100) : 0;
                return (
                  <div
                    key={p.ip}
                    className={`rounded-xl border p-3 ${
                      p.burned ? "border-red-400/30 bg-red-400/5" : "border-white/5 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-mono text-[#c9c4bc] truncate">{p.ip}</p>
                      <StatusBadge status={status} />
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden mb-1">
                      <div
                        className={`h-full rounded-full ${p.burned ? "bg-red-400" : p.coolingDown ? "bg-yellow-400" : "bg-[#f4cf8f]"}`}
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#c9c4bc]/60">
                      {p.windowUsed}/{p.windowLimit} req/5s
                      {p.consecutive403 > 0 && <span className="text-red-400 ml-1">({p.consecutive403} 403s)</span>}
                    </p>
                    {burnMap.get(p.ip) && (
                      <p className={`text-[10px] mt-0.5 ${(burnMap.get(p.ip)?.burns ?? 0) >= 5 ? "text-red-400 font-semibold" : "text-orange-400/70"}`}>
                        {burnMap.get(p.ip)!.burns}x burned (48h)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {hasMore && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-[#c9c4bc]/60 hover:text-[#f4cf8f] transition-colors"
              >
                {expanded ? "Show less" : `Show all ${sorted.length} proxies`}
              </button>
            )}
          </>
        );
      })()}

      {/* Cache + concurrency row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-white/5 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#c9c4bc]/60">Cache</p>
          <p className="text-lg font-bold text-[#f4cf8f]">{u.cache.size}/{u.cache.maxSize}</p>
          <p className="text-[10px] text-[#c9c4bc]/40">Hit rate: {hitRate}%</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/5 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#c9c4bc]/60">Inflight</p>
          <p className="text-lg font-bold text-[#f4cf8f]">{u.inflight}</p>
          <p className="text-[10px] text-[#c9c4bc]/40">Dedup hits: {u.dedupHits}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/5 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#c9c4bc]/60">Upstream Req</p>
          <p className="text-lg font-bold text-[#f4cf8f]">{u.upstreamRequests.toLocaleString()}</p>
          <p className="text-[10px] text-[#c9c4bc]/40">Total since boot</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/5 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#c9c4bc]/60">Proxies</p>
          <p className="text-lg font-bold text-[#f4cf8f]">{u.itunesProxies}</p>
          <p className="text-[10px] text-[#c9c4bc]/40">{burnedCount} burned</p>
        </div>
      </div>

      {/* Live semaphore gauges */}
      <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
        <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#c9c4bc]/60">Live Concurrency</h4>
        <div className="grid grid-cols-2 gap-6">
          {Object.entries(u.concurrency).map(([domain, sem]) => (
            <SemaphoreGauge
              key={domain}
              label={domain.replace("amp-api-edge.apps.apple.com", "amp-api-edge").replace("itunes.apple.com", "itunes")}
              active={sem.active}
              max={sem.max}
            />
          ))}
        </div>
      </div>

      {/* Route limiters */}
      {routes && Object.keys(routes).length > 0 && (
        <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#c9c4bc]/60">Route Limiters</h4>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Object.entries(routes).map(([name, stats]) => (
              <div key={name}>
                <p className="text-[10px] text-[#c9c4bc]/60 truncate">{name}</p>
                <p className="text-sm font-mono text-[#f4cf8f]">{stats.active}/{stats.maxActive}</p>
                {stats.rejected > 0 && (
                  <p className="text-[10px] text-red-400">{stats.rejected} rejected</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
