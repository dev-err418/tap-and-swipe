"use client";

import { useState, useEffect, useCallback } from "react";
import { Check } from "lucide-react";

interface Feedback {
  id: number;
  license_key: string;
  stripe_customer_id: string | null;
  message: string;
  created_at: string;
}

export default function FeedbackPanel() {
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

  if (loading) return <p className="text-sm text-[#c9c4bc]/60">Loading feedback...</p>;

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/5 p-12 text-center">
        <p className="text-sm text-[#c9c4bc]">No feedback yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((f) => (
        <div key={f.id} className="flex items-start gap-4 rounded-xl border border-white/5 bg-white/5 p-4">
          <div className="flex-1 min-w-0">
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
    </div>
  );
}
