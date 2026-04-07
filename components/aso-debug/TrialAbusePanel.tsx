"use client";

import { useState, useEffect, useCallback } from "react";

interface TrialAbuseRow {
  machine_id: string;
  license_count: number;
  emails: (string | null)[];
  keys: string[];
  statuses: string[];
  warned_dates: (string | null)[];
  created_dates: string[];
  has_active: boolean;
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-emerald-400/20", text: "text-emerald-400", label: "Active" },
  warned: { bg: "bg-yellow-400/20", text: "text-yellow-400", label: "Warned" },
  revoked: { bg: "bg-red-400/20", text: "text-red-400", label: "Revoked" },
  appeal_pending: { bg: "bg-blue-400/20", text: "text-blue-400", label: "Appeal" },
};

export default function TrialAbusePanel() {
  const [rows, setRows] = useState<TrialAbuseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/aso/analytics?period=30d");
      if (res.ok) {
        const data = await res.json();
        setRows(data.trialAbuse || []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function copyId(id: string) {
    navigator.clipboard.writeText(id);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  async function handleAction(key: string, action: "clear" | "revoke") {
    setActing(key);
    try {
      const res = await fetch("/api/aso/trial-abuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, action }),
      });
      if (res.ok) await fetchData();
    } catch {}
    setActing(null);
  }

  if (loading) return <p className="text-sm text-[#c9c4bc]/60">Loading trial abuse data...</p>;
  if (rows.length === 0) return <p className="text-sm text-[#c9c4bc]/60">No trial abuse detected.</p>;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[#c9c4bc]/60 border-b border-white/10">
            <th className="text-left px-4 py-2 font-medium">Machine ID</th>
            <th className="text-right px-4 py-2 font-medium">Licenses</th>
            <th className="text-left px-4 py-2 font-medium">Details</th>
            <th className="text-right px-4 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.machine_id} className="border-b border-white/5 align-top">
              <td className="px-4 py-2">
                <button
                  onClick={() => copyId(r.machine_id)}
                  className="font-mono text-[#c9c4bc] hover:text-[#f4cf8f] transition-colors cursor-pointer text-left"
                  title={`Click to copy: ${r.machine_id}`}
                >
                  {copied === r.machine_id ? (
                    <span className="text-emerald-400">Copied!</span>
                  ) : (
                    r.machine_id.slice(0, 14) + "..."
                  )}
                </button>
              </td>
              <td className="px-4 py-2 text-right">
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-red-400/20 text-red-400">
                  {r.license_count}
                </span>
              </td>
              <td className="px-4 py-2">
                <div className="flex flex-col gap-1">
                  {r.keys.map((key, i) => {
                    const status = r.statuses?.[i] || "active";
                    const badge = STATUS_BADGE[status] || STATUS_BADGE.active;
                    const email = r.emails[i];
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                        <span className="font-mono text-[#c9c4bc]/40 text-[10px]">{key.slice(0, 14)}...</span>
                        {email && <span className="text-[#c9c4bc]/60 truncate max-w-[180px]">{email}</span>}
                      </div>
                    );
                  })}
                </div>
              </td>
              <td className="px-4 py-2 text-right">
                <div className="flex flex-col gap-1 items-end">
                  {r.keys.map((key, i) => {
                    const status = r.statuses?.[i] || "active";
                    const isActing = acting === key;
                    if (status === "warned" || status === "appeal_pending") {
                      return (
                        <div key={key} className="flex gap-1">
                          <button
                            onClick={() => handleAction(key, "clear")}
                            disabled={isActing}
                            className="rounded px-2 py-0.5 text-[10px] font-medium bg-emerald-400/20 text-emerald-400 hover:bg-emerald-400/30 disabled:opacity-50 transition-colors"
                          >
                            {isActing ? "..." : "Clear"}
                          </button>
                          <button
                            onClick={() => handleAction(key, "revoke")}
                            disabled={isActing}
                            className="rounded px-2 py-0.5 text-[10px] font-medium bg-red-400/20 text-red-400 hover:bg-red-400/30 disabled:opacity-50 transition-colors"
                          >
                            {isActing ? "..." : "Revoke"}
                          </button>
                        </div>
                      );
                    }
                    return <div key={key} className="h-5" />;
                  })}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
