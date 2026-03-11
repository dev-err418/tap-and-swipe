"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Copy,
  Check,
  Plus,
  KeyRound,
  RotateCcw,
  BarChart3,
  MessageSquare,
} from "lucide-react";

interface License {
  id: number;
  key: string;
  email: string | null;
  stripe_customer_id: string | null;
  active: boolean;
  created_at: string;
  last_used_at: string | null;
  machine_id: string | null;
}

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

interface Feedback {
  id: number;
  license_key: string;
  message: string;
  created_at: string;
}

type Tab = "licenses" | "analytics" | "feedback";
type Period = "1h" | "6h" | "24h" | "7d" | "30d";

// ---------------------------------------------------------------------------
// Analytics Panel
// ---------------------------------------------------------------------------
function AnalyticsPanel() {
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

  if (loading && !data)
    return <p className="text-sm text-[#c9c4bc]/60">Loading analytics...</p>;
  if (!data)
    return (
      <p className="text-sm text-[#c9c4bc]/60">No analytics data yet.</p>
    );

  const { summary: s, timeseries } = data;
  const maxReq = Math.max(1, ...timeseries.map((r) => r.requests));
  const maxRL = Math.max(
    1,
    ...timeseries.map(
      (r) =>
        r.rate_limits_global +
        r.rate_limits_auth +
        r.rate_limits_license +
        r.rate_limits_suggestions
    )
  );

  function fmtTime(iso: string) {
    const d = new Date(iso);
    if (period === "7d" || period === "30d")
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Semaphore max values (amp=8, itunes=20 or 4)
  const AMP_MAX = 8;
  const ITUNES_MAX = 20;

  return (
    <div className="space-y-8">
      {/* Period selector */}
      <div className="flex gap-2">
        {periods.map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${
              period === p
                ? "bg-[#f4cf8f] text-[#2a2725]"
                : "bg-white/5 text-[#c9c4bc] hover:bg-white/10"
            }`}
          >
            {p}
          </button>
        ))}
        {loading && (
          <span className="ml-2 self-center text-xs text-[#c9c4bc]/40">
            updating...
          </span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard
          label="Total Requests"
          value={s.requests.toLocaleString()}
        />
        <SummaryCard
          label="Rate Limits"
          value={s.rateLimits.toLocaleString()}
          sub={`G:${s.rateLimitsGlobal} A:${s.rateLimitsAuth} L:${s.rateLimitsLicense} S:${s.rateLimitsSuggestions}`}
        />
        <SummaryCard
          label="Unique Licenses"
          value={String(s.uniqueLicenses)}
        />
        <SummaryCard
          label="Cache Hit Rate"
          value={`${s.cacheHitRate}%`}
          sub={`${s.cacheHits.toLocaleString()} hits / ${(s.cacheHits + s.cacheMisses).toLocaleString()} total`}
        />
      </div>

      {/* Request volume chart */}
      <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#c9c4bc]/60">
          Request Volume
        </h3>
        {timeseries.length === 0 ? (
          <p className="text-sm text-[#c9c4bc]/40">No data in this period</p>
        ) : (
          <div className="flex items-end gap-[2px]" style={{ height: 120 }}>
            {timeseries.map((r, i) => {
              const h = (r.requests / maxReq) * 100;
              return (
                <div
                  key={i}
                  className="group relative flex-1 min-w-[2px]"
                  style={{ height: "100%" }}
                >
                  <div
                    className="absolute bottom-0 w-full rounded-t bg-[#f4cf8f] transition-all hover:bg-[#f4cf8f]/80"
                    style={{ height: `${Math.max(h, 1)}%` }}
                  />
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
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#c9c4bc]/60">
            Rate Limits Over Time
          </h3>
          <div className="flex items-end gap-[2px]" style={{ height: 80 }}>
            {timeseries.map((r, i) => {
              const total =
                r.rate_limits_global +
                r.rate_limits_auth +
                r.rate_limits_license +
                r.rate_limits_suggestions;
              const h = (total / maxRL) * 100;
              // Stacked segments
              const pctG = total > 0 ? (r.rate_limits_global / total) * 100 : 0;
              const pctA = total > 0 ? (r.rate_limits_auth / total) * 100 : 0;
              const pctL =
                total > 0 ? (r.rate_limits_license / total) * 100 : 0;
              const pctS =
                total > 0 ? (r.rate_limits_suggestions / total) * 100 : 0;
              return (
                <div
                  key={i}
                  className="group relative flex-1 min-w-[2px]"
                  style={{ height: "100%" }}
                >
                  <div
                    className="absolute bottom-0 w-full flex flex-col-reverse rounded-t overflow-hidden"
                    style={{ height: `${Math.max(h, total > 0 ? 2 : 0)}%` }}
                  >
                    {pctG > 0 && (
                      <div
                        className="w-full bg-red-400"
                        style={{ height: `${pctG}%` }}
                      />
                    )}
                    {pctA > 0 && (
                      <div
                        className="w-full bg-orange-400"
                        style={{ height: `${pctA}%` }}
                      />
                    )}
                    {pctL > 0 && (
                      <div
                        className="w-full bg-yellow-400"
                        style={{ height: `${pctL}%` }}
                      />
                    )}
                    {pctS > 0 && (
                      <div
                        className="w-full bg-blue-400"
                        style={{ height: `${pctS}%` }}
                      />
                    )}
                  </div>
                  <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#1a1917] px-2 py-1 text-[10px] text-[#f1ebe2] shadow group-hover:block">
                    {total} limits &middot; {fmtTime(r.bucket)}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-[#c9c4bc]/60">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-red-400" />{" "}
              Global
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-orange-400" />{" "}
              Auth
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-yellow-400" />{" "}
              License
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-blue-400" />{" "}
              Suggestions
            </span>
          </div>
        </div>
      )}

      {/* Proxy load */}
      <div className="rounded-2xl border border-white/5 bg-white/5 p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#c9c4bc]/60">
          Proxy / Semaphore Load
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <SemaphoreGauge
            label="amp-api-edge"
            peakActive={s.semAmpPeakActive}
            peakQueued={s.semAmpPeakQueued}
            max={AMP_MAX}
          />
          <SemaphoreGauge
            label="itunes.apple.com"
            peakActive={s.semItunesPeakActive}
            peakQueued={s.semItunesPeakQueued}
            max={ITUNES_MAX}
          />
        </div>

        {/* Historical peak chart */}
        {timeseries.length > 0 && (
          <div className="mt-6">
            <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-[#c9c4bc]/40">
              Semaphore Peak Active Over Time
            </h4>
            <div className="flex items-end gap-[2px]" style={{ height: 60 }}>
              {timeseries.map((r, i) => {
                const ampPct = (r.sem_amp_peak_active / AMP_MAX) * 100;
                const itunesPct =
                  (r.sem_itunes_peak_active / ITUNES_MAX) * 100;
                const maxPct = Math.max(ampPct, itunesPct);
                return (
                  <div
                    key={i}
                    className="group relative flex-1 min-w-[2px]"
                    style={{ height: "100%" }}
                  >
                    <div
                      className="absolute bottom-0 w-full rounded-t bg-[#f4cf8f]/50"
                      style={{ height: `${Math.max(maxPct, 1)}%` }}
                    />
                    <div className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-[#1a1917] px-2 py-1 text-[10px] text-[#f1ebe2] shadow group-hover:block">
                      amp:{r.sem_amp_peak_active}/{AMP_MAX} itunes:
                      {r.sem_itunes_peak_active}/{ITUNES_MAX}
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

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/5 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#c9c4bc]/60">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold text-[#f4cf8f]">{value}</p>
      {sub && (
        <p className="mt-0.5 text-[10px] text-[#c9c4bc]/40">{sub}</p>
      )}
    </div>
  );
}

function SemaphoreGauge({
  label,
  peakActive,
  peakQueued,
  max,
}: {
  label: string;
  peakActive: number;
  peakQueued: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min(100, (peakActive / max) * 100) : 0;
  const full = peakActive >= max;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <p className="text-xs text-[#c9c4bc]">
          <span className="font-mono text-[#f4cf8f]">{peakActive}/{max}</span>{" "}
          {label}
          {peakQueued > 0 && (
            <span className="text-[#c9c4bc]/40"> +{peakQueued} queued</span>
          )}
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

// ---------------------------------------------------------------------------
// Feedback Panel
// ---------------------------------------------------------------------------
function FeedbackPanel() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/aso/feedback");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const remove = async (id: number) => {
    if (!confirm("Remove this feedback?")) return;
    setRemoving(id);
    await fetch("/api/aso/feedback", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setItems((prev) => prev.filter((f) => f.id !== id));
    setRemoving(null);
  };

  if (loading)
    return <p className="text-sm text-[#c9c4bc]/60">Loading feedback...</p>;

  if (items.length === 0)
    return (
      <div className="rounded-2xl border border-white/5 bg-white/5 p-12 text-center">
        <p className="text-sm text-[#c9c4bc]">No feedback yet.</p>
      </div>
    );

  return (
    <div className="space-y-3">
      {items.map((f) => (
        <div
          key={f.id}
          className="flex items-start gap-4 rounded-xl border border-white/5 bg-white/5 p-4"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#f1ebe2] whitespace-pre-wrap">{f.message}</p>
            <div className="mt-2 flex items-center gap-3 text-[10px] text-[#c9c4bc]/50">
              <span className="font-mono">{f.license_key}</span>
              <span>{new Date(f.created_at).toLocaleString()}</span>
            </div>
          </div>
          <button
            onClick={() => remove(f.id)}
            disabled={removing === f.id}
            className="shrink-0 rounded-lg border border-[#f4cf8f]/20 p-2 text-[#f4cf8f] transition-colors hover:bg-[#f4cf8f]/10 disabled:opacity-40"
            title="Remove"
          >
            <Check className={`h-4 w-4 ${removing === f.id ? "animate-pulse" : ""}`} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function AsoDebugPage() {
  const [tab, setTab] = useState<Tab>("licenses");
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [resettingMachine, setResettingMachine] = useState<string | null>(null);
  const [feedbackCount, setFeedbackCount] = useState<number | null>(null);

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/aso/licenses");
    if (res.ok) {
      setLicenses(await res.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLicenses();
    fetch("/api/aso/feedback")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setFeedbackCount(data.length));
  }, [fetchLicenses]);

  const generate = async () => {
    setGenerating(true);
    const res = await fetch("/api/aso/licenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email || undefined }),
    });
    if (res.ok) {
      setEmail("");
      fetchLicenses();
    }
    setGenerating(false);
  };

  const toggleActive = async (key: string, active: boolean) => {
    await fetch("/api/aso/licenses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, active }),
    });
    fetchLicenses();
  };

  const resetMachine = async (key: string) => {
    setResettingMachine(key);
    await fetch("/api/aso/licenses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, reset_machine: true }),
    });
    fetchLicenses();
    setResettingMachine(null);
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (process.env.NODE_ENV === "production") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#2a2725]">
        <p className="text-[#c9c4bc]">Not available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#2a2725] text-[#f1ebe2] font-[family-name:var(--font-uncut)] selection:bg-[#f4cf8f]/30">
      <div className="mx-auto max-w-4xl px-6 py-16">
        {/* Header */}
        <div className="mb-10">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4cf8f]/10">
              {tab === "licenses" ? (
                <KeyRound className="h-5 w-5 text-[#f4cf8f]" />
              ) : tab === "analytics" ? (
                <BarChart3 className="h-5 w-5 text-[#f4cf8f]" />
              ) : (
                <MessageSquare className="h-5 w-5 text-[#f4cf8f]" />
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              ASO Debug
            </h1>
          </div>
          <p className="text-sm text-[#c9c4bc]">
            Dev-only dashboard for App Sprint ASO.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="mb-8 flex gap-1 rounded-lg bg-white/5 p-1 w-fit">
          <button
            onClick={() => setTab("licenses")}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === "licenses"
                ? "bg-[#f4cf8f] text-[#2a2725]"
                : "text-[#c9c4bc] hover:text-[#f1ebe2]"
            }`}
          >
            Licenses
          </button>
          <button
            onClick={() => setTab("analytics")}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === "analytics"
                ? "bg-[#f4cf8f] text-[#2a2725]"
                : "text-[#c9c4bc] hover:text-[#f1ebe2]"
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setTab("feedback")}
            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === "feedback"
                ? "bg-[#f4cf8f] text-[#2a2725]"
                : "text-[#c9c4bc] hover:text-[#f1ebe2]"
            }`}
          >
            Feedback{feedbackCount !== null ? ` (${feedbackCount})` : ""}
          </button>
        </div>

        {/* Licenses tab */}
        {tab === "licenses" && (
          <>
            {/* Generate */}
            <div className="mb-8 flex items-center gap-3">
              <input
                type="email"
                placeholder="Email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generate()}
                className="h-10 w-60 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-[#f1ebe2] placeholder:text-[#c9c4bc]/50 outline-none transition-colors focus:border-[#f4cf8f]/40"
              />
              <button
                onClick={generate}
                disabled={generating}
                className="flex h-10 items-center gap-2 rounded-lg bg-[#f4cf8f] px-5 text-sm font-semibold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20 disabled:cursor-wait disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {generating ? "Generating..." : "Generate Key"}
              </button>
            </div>

            {/* Table */}
            {loading ? (
              <p className="text-sm text-[#c9c4bc]/60">Loading...</p>
            ) : licenses.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-white/5 p-12 text-center">
                <p className="text-sm text-[#c9c4bc]">No license keys yet.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/5">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-[#c9c4bc]/60">
                      <th className="px-4 py-3 font-medium">Key</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Machine</th>
                      <th className="px-4 py-3 font-medium">Created</th>
                      <th className="px-4 py-3 font-medium">Last Used</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {licenses.map((l) => (
                      <tr
                        key={l.id}
                        className="border-b border-white/5 transition-colors hover:bg-white/5"
                      >
                        {/* Key */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => copyKey(l.key)}
                            className="group flex items-center gap-2 font-mono text-xs text-[#f4cf8f] transition-opacity hover:opacity-80"
                            title="Click to copy"
                          >
                            {copiedKey === l.key ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-green-400" />
                                <span className="text-green-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                                {l.key}
                              </>
                            )}
                          </button>
                        </td>

                        {/* Email */}
                        <td className="px-4 py-3 text-[#c9c4bc]">
                          {l.email ? (
                            <span title={l.email}>
                              {l.email.length > 10 ? l.email.slice(0, 10) + "..." : l.email}
                            </span>
                          ) : (
                            <span className="text-[#c9c4bc]/30">&mdash;</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              l.active
                                ? "bg-green-500/10 text-green-400"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {l.active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Machine */}
                        <td className="px-4 py-3">
                          {l.machine_id ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className="max-w-[120px] truncate font-mono text-xs text-[#c9c4bc]/60"
                                title={l.machine_id}
                              >
                                {l.machine_id.slice(0, 8)}...
                              </span>
                              <button
                                onClick={() => resetMachine(l.key)}
                                disabled={resettingMachine === l.key}
                                className="rounded p-1 text-[#c9c4bc]/40 transition-colors hover:bg-white/10 hover:text-[#f4cf8f] disabled:opacity-40"
                                title="Reset machine binding"
                              >
                                <RotateCcw
                                  className={`h-3 w-3 ${resettingMachine === l.key ? "animate-spin" : ""}`}
                                />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[#c9c4bc]/30">
                              Unbound
                            </span>
                          )}
                        </td>

                        {/* Created */}
                        <td className="px-4 py-3 text-[#c9c4bc]/60">
                          {new Date(l.created_at).toLocaleDateString()}
                        </td>

                        {/* Last Used */}
                        <td className="px-4 py-3 text-[#c9c4bc]/60">
                          {l.last_used_at
                            ? new Date(l.last_used_at).toLocaleDateString()
                            : "Never"}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleActive(l.key, !l.active)}
                            className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
                              l.active
                                ? "border-red-500/20 text-red-400 hover:bg-red-500/10"
                                : "border-green-500/20 text-green-400 hover:bg-green-500/10"
                            }`}
                          >
                            {l.active ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Analytics tab */}
        {tab === "analytics" && <AnalyticsPanel />}

        {/* Feedback tab */}
        {tab === "feedback" && <FeedbackPanel />}
      </div>
    </div>
  );
}
