"use client";

import { useState, useEffect, useCallback } from "react";

interface TrialAbuseRow {
  machine_id: string;
  license_count: number;
  emails: (string | null)[];
  keys: string[];
  created_dates: string[];
}

export default function TrialAbusePanel() {
  const [rows, setRows] = useState<TrialAbuseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

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

  if (loading) return <p className="text-sm text-[#c9c4bc]/60">Loading trial abuse data...</p>;
  if (rows.length === 0) return <p className="text-sm text-[#c9c4bc]/60">No trial abuse detected.</p>;

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[#c9c4bc]/60 border-b border-white/10">
            <th className="text-left px-4 py-2 font-medium">Machine ID</th>
            <th className="text-right px-4 py-2 font-medium">Licenses</th>
            <th className="text-left px-4 py-2 font-medium">Emails</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const uniqueEmails = [...new Set(r.emails.filter(Boolean))];
            return (
              <tr key={r.machine_id} className="border-b border-white/5">
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
                  <div className="flex flex-col gap-0.5">
                    {uniqueEmails.map((email) => (
                      <span key={email} className="text-[#c9c4bc]/60 truncate max-w-[240px]">{email}</span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
