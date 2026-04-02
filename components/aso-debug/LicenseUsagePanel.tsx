"use client";

import { useState, useEffect, useCallback } from "react";

interface LicenseUsageRow {
  license_key: string;
  total_requests: number;
  today_requests: number;
}

type Period = "1h" | "6h" | "24h" | "7d" | "30d";
type SortKey = "total" | "today";

export default function LicenseUsagePanel() {
  const [period, setPeriod] = useState<Period>("7d");
  const [rows, setRows] = useState<LicenseUsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("total");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/aso/analytics?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.licenseUsage || []);
      }
    } catch {}
    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const periods: Period[] = ["1h", "6h", "24h", "7d", "30d"];

  const sorted = [...rows].sort((a, b) =>
    sortBy === "total"
      ? b.total_requests - a.total_requests
      : (b.today_requests ?? 0) - (a.today_requests ?? 0)
  );

  const periodDays = { "1h": 1, "6h": 1, "24h": 1, "7d": 7, "30d": 30 }[period];

  return (
    <div className="space-y-4">
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
        {loading && <span className="ml-2 self-center text-xs text-[#c9c4bc]/40">loading...</span>}
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-[#c9c4bc]/60">No license usage data yet.</p>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-white/5 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#c9c4bc]/60 border-b border-white/10">
                <th className="text-left px-4 py-2 font-medium">License Key</th>
                <th
                  className="text-right px-4 py-2 font-medium cursor-pointer hover:text-[#f4cf8f]"
                  onClick={() => setSortBy("today")}
                >
                  Today {sortBy === "today" && "▼"}
                </th>
                <th
                  className="text-right px-4 py-2 font-medium cursor-pointer hover:text-[#f4cf8f]"
                  onClick={() => setSortBy("total")}
                >
                  Total ({period}) {sortBy === "total" && "▼"}
                </th>
                <th className="text-right px-4 py-2 font-medium">Avg/day</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const avg = periodDays > 0 ? Math.round(r.total_requests / periodDays) : r.total_requests;
                const hot = avg > 5000;
                return (
                  <tr
                    key={r.license_key}
                    className={`border-b border-white/5 ${hot ? "bg-red-400/5" : ""}`}
                  >
                    <td className="px-4 py-2 font-mono text-[#c9c4bc]">
                      {r.license_key.slice(0, 12)}...
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-[#f4cf8f]">
                      {(r.today_requests ?? 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-[#f4cf8f]">
                      {r.total_requests.toLocaleString()}
                    </td>
                    <td className={`px-4 py-2 text-right tabular-nums ${hot ? "text-red-400 font-bold" : "text-[#c9c4bc]/60"}`}>
                      {avg.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
