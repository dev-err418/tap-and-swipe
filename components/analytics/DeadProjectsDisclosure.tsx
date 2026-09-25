"use client";

import { useState } from "react";
import { loadDeadProjectCards, type DeadProjectCard } from "@/app/analytics/dead-projects";
import { WebsiteSummaryCard } from "@/components/analytics/website-summary-card";

type Period = "day" | "yesterday" | "3days" | "week" | "month" | "all";

export default function DeadProjectsDisclosure({ period }: { period: Period }) {
  const [open, setOpen] = useState(false);
  const [cards, setCards] = useState<DeadProjectCard[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || cards || loading) return;
    setLoading(true);
    setFailed(false);
    try {
      setCards(await loadDeadProjectCards(period));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {open ? (
        <section className="space-y-6">
          <h3 className="text-lg font-semibold tracking-tight text-black/55">Dead project</h3>
          {loading ? <p className="text-sm text-black/45">Loading…</p> : null}
          {failed ? <p className="text-sm text-black/45">Dead projects could not be loaded.</p> : null}
          {cards && cards.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => (
                <WebsiteSummaryCard
                  key={card.site}
                  period={period}
                  site={card.site}
                  domain={card.domain}
                  metrics={card.metrics}
                  activeTests={card.activeTests}
                  trend={card.trend.map((point) => ({ ...point, bucket: new Date(point.bucket) }))}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => void toggle()}
          className="text-sm font-medium text-black/45 transition-colors hover:text-black"
        >
          {open ? "See less" : "See more"}
        </button>
      </div>
    </div>
  );
}
