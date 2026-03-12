"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Check, Plus, RotateCcw } from "lucide-react";

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

export default function LicensesPanel() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [resettingMachine, setResettingMachine] = useState<string | null>(null);

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/aso/licenses");
    if (res.ok) setLicenses(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLicenses();
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

  return (
    <div>
      {/* Generate */}
      <div className="mb-6 flex items-center gap-3">
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
                <tr key={l.id} className="border-b border-white/5 transition-colors hover:bg-white/5">
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
                  <td className="px-4 py-3 text-[#c9c4bc]">
                    {l.email ? (
                      <span title={l.email}>
                        {l.email.length > 10 ? l.email.slice(0, 10) + "..." : l.email}
                      </span>
                    ) : (
                      <span className="text-[#c9c4bc]/30">&mdash;</span>
                    )}
                  </td>
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
                          <RotateCcw className={`h-3 w-3 ${resettingMachine === l.key ? "animate-spin" : ""}`} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#c9c4bc]/30">Unbound</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#c9c4bc]/60">
                    {new Date(l.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-[#c9c4bc]/60">
                    {l.last_used_at ? new Date(l.last_used_at).toLocaleDateString() : "Never"}
                  </td>
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
    </div>
  );
}
