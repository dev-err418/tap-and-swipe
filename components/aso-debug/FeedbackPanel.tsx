"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Check } from "lucide-react";

type Status = "Pro" | "Solo" | "Trialing" | "Expired";
const STATUSES: Status[] = ["Pro", "Solo", "Trialing", "Expired"];

const STATUS_COLORS: Record<Status, string> = {
  Pro: "bg-[#f4cf8f]/20 text-[#f4cf8f]",
  Solo: "bg-blue-500/20 text-blue-400",
  Trialing: "bg-purple-500/20 text-purple-400",
  Expired: "bg-red-500/20 text-red-400",
};

interface Feedback {
  id: number;
  license_key: string;
  stripe_customer_id: string | null;
  message: string;
  created_at: string;
  status: Status;
}

export default function FeedbackPanel() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Status | "All">("All");

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/aso/feedback");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const counts = useMemo(() => {
    const map: Record<Status, number> = { Pro: 0, Solo: 0, Trialing: 0, Expired: 0 };
    for (const item of items) {
      if (map[item.status] !== undefined) map[item.status]++;
    }
    return map;
  }, [items]);

  const filtered = useMemo(
    () => (activeTab === "All" ? items : items.filter((f) => f.status === activeTab)),
    [items, activeTab]
  );

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

  if (loading) return <p className="text-sm text-[#c9c4bc]/60">Loading feedback...</p>;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/5 p-12 text-center">
        <p className="text-sm text-[#c9c4bc]">No feedback yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab("All")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "All"
              ? "bg-white/10 text-[#f1ebe2]"
              : "text-[#c9c4bc]/60 hover:text-[#c9c4bc]"
          }`}
        >
          All ({items.length})
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setActiveTab(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === s
                ? `${STATUS_COLORS[s]}`
                : "text-[#c9c4bc]/60 hover:text-[#c9c4bc]"
            }`}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Feedback list */}
      <div className="space-y-3">
        {filtered.map((f) => (
          <div key={f.id} className="flex items-start gap-4 rounded-xl border border-white/5 bg-white/5 p-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_COLORS[f.status]}`}
                >
                  {f.status}
                </span>
              </div>
              <p className="text-sm text-[#f1ebe2] whitespace-pre-wrap">{f.message}</p>
              <div className="mt-2 flex items-center gap-3 text-[10px] text-[#c9c4bc]/50">
                <span className="font-mono">{f.license_key}{f.stripe_customer_id ? ` · ${f.stripe_customer_id}` : ""}</span>
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
        {filtered.length === 0 && (
          <p className="text-sm text-[#c9c4bc]/50 text-center py-8">
            No {activeTab.toLowerCase()} feedback.
          </p>
        )}
      </div>
    </div>
  );
}
