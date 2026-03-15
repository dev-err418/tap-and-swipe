"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Copy, Check, Plus, RotateCcw, Search, Trash2 } from "lucide-react";

interface License {
  id: number;
  key: string;
  email: string | null;
  stripe_customer_id: string | null;
  active: boolean;
  plan: string | null;
  created_at: string;
  last_used_at: string | null;
  machine_id: string | null;
}

type EditingCell = { key: string; field: string } | null;

export default function LicensesPanel({ limit }: { limit?: number } = {}) {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [resettingMachine, setResettingMachine] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  const fetchLicenses = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (search) params.set("search", search);
    const qs = params.toString();
    const res = await fetch(`/api/aso/licenses${qs ? `?${qs}` : ""}`);
    if (res.ok) setLicenses(await res.json());
    setLoading(false);
  }, [limit, search]);

  useEffect(() => {
    fetchLicenses();
  }, [fetchLicenses]);

  useEffect(() => {
    if (editing && editRef.current) editRef.current.focus();
  }, [editing]);

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

  const updateField = async (key: string, field: string, value: unknown) => {
    await fetch("/api/aso/licenses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, [field]: value }),
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

  const deleteLicense = async (key: string) => {
    if (!confirm(`Delete license ${key}? This cannot be undone.`)) return;
    await fetch("/api/aso/licenses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    fetchLicenses();
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const startEdit = (key: string, field: string, currentValue: string | null) => {
    setEditing({ key, field });
    setEditValue(currentValue ?? "");
  };

  const commitEdit = () => {
    if (!editing) return;
    updateField(editing.key, editing.field, editValue);
    setEditing(null);
  };

  const cancelEdit = () => setEditing(null);

  const renderCell = (l: License, field: string, displayValue: string | null, truncate?: number) => {
    if (editing?.key === l.key && editing?.field === field) {
      return (
        <input
          ref={editRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") cancelEdit();
          }}
          className="h-7 w-full rounded border border-[#f4cf8f]/40 bg-white/5 px-2 text-xs text-[#f1ebe2] outline-none"
        />
      );
    }

    return (
      <button
        onClick={() => startEdit(l.key, field, displayValue)}
        className="text-left w-full hover:text-[#f4cf8f] transition-colors cursor-text"
        title="Click to edit"
      >
        {displayValue ? (
          truncate && displayValue.length > truncate ? (
            <span title={displayValue}>{displayValue.slice(0, truncate)}...</span>
          ) : (
            displayValue
          )
        ) : (
          <span className="text-[#c9c4bc]/30">&mdash;</span>
        )}
      </button>
    );
  };

  return (
    <div>
      {/* Search + Generate */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#c9c4bc]/50" />
          <input
            type="text"
            placeholder="Search key, email, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-72 rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-[#f1ebe2] placeholder:text-[#c9c4bc]/50 outline-none transition-colors focus:border-[#f4cf8f]/40"
          />
        </div>
        <div className="flex-1" />
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
          <p className="text-sm text-[#c9c4bc]">
            {search ? "No licenses match your search." : "No license keys yet."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-[#c9c4bc]/60">
                <th className="px-4 py-3 font-medium">Key</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Plan</th>
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
                    {renderCell(l, "email", l.email, 24)}
                  </td>
                  <td className="px-4 py-3 text-[#c9c4bc]">
                    {renderCell(l, "stripe_customer_id", l.stripe_customer_id, 16)}
                  </td>
                  <td className="px-4 py-3">
                    {editing?.key === l.key && editing?.field === "plan" ? (
                      <select
                        autoFocus
                        value={editValue}
                        onChange={(e) => {
                          setEditValue(e.target.value);
                          updateField(l.key, "plan", e.target.value);
                          setEditing(null);
                        }}
                        onBlur={cancelEdit}
                        className="h-7 rounded border border-[#f4cf8f]/40 bg-white/5 px-2 text-xs text-[#f1ebe2] outline-none"
                      >
                        <option value="solo">Solo</option>
                        <option value="pro">Pro</option>
                      </select>
                    ) : (
                      <button
                        onClick={() => startEdit(l.key, "plan", l.plan)}
                        className="hover:opacity-80 transition-opacity"
                        title="Click to change plan"
                      >
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            l.plan === "pro"
                              ? "bg-[#f4cf8f]/10 text-[#f4cf8f]"
                              : "bg-blue-500/10 text-blue-400"
                          }`}
                        >
                          {l.plan === "pro" ? "Pro" : l.plan === "solo" ? "Solo" : l.plan ?? "—"}
                        </span>
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => updateField(l.key, "active", !l.active)}
                      className="hover:opacity-80 transition-opacity"
                      title="Click to toggle"
                    >
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          l.active
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {l.active ? "Active" : "Inactive"}
                      </span>
                    </button>
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateField(l.key, "active", !l.active)}
                        className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${
                          l.active
                            ? "border-red-500/20 text-red-400 hover:bg-red-500/10"
                            : "border-green-500/20 text-green-400 hover:bg-green-500/10"
                        }`}
                      >
                        {l.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => deleteLicense(l.key)}
                        className="rounded p-1.5 text-[#c9c4bc]/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        title="Delete license"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
