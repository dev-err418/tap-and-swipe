"use client";

import { useState } from "react";
import type { AppSprintFunnelAnalytics } from "@/lib/appsprint-funnel";
import { DashboardCard } from "./DashboardCard";

type Row = NonNullable<AppSprintFunnelAnalytics["ctaExperiment"]>[number];
const placements: Record<string, string> = { hero: "Above the tool", result: "After the result", article_footer: "Article footer" };

export default function MarketingCtaExperiment({ rows, windowDays }: { rows: Row[] | undefined; windowDays: number }) {
  const [page, setPage] = useState("all");
  const pages = [...new Map((rows ?? []).map((row) => [row.page, row.pageLabel])).entries()];
  const visible = (rows ?? []).filter((row) => page === "all" || row.page === page);
  return <DashboardCard title="SEO page CTA A/B test" action={<span className="text-xs text-muted-foreground">50/50 · Last {windowDays} days</span>} contentClassName="min-w-0 p-0">
    <div className="flex items-center gap-3 px-4 py-3">
      <label htmlFor="cta-page" className="text-sm text-muted-foreground">Page</label>
      <select id="cta-page" value={page} onChange={(event) => setPage(event.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm">
        <option value="all">All tested pages</option>{pages.map(([path, label]) => <option key={path} value={path}>{label}</option>)}
      </select>
    </div>
    <div className="overflow-x-auto"><table className="w-max min-w-full text-sm">
      <thead><tr className="border-y border-black/10 text-left text-xs text-black/50">{["Page / position", "Experience", "Eligible visitors", "CTA viewers", "Clickers", "Clicks / eligible visitor", "Clicks / CTA viewer", "Checkout visitors", "Paid visitors"].map((label, index) => <th key={label} className={`whitespace-nowrap px-4 py-3 font-medium ${index > 1 ? "text-right" : ""}`}>{label}</th>)}</tr></thead>
      <tbody>{visible.map((row) => <tr key={`${row.experiment}:${row.page}:${row.placement}:${row.variant}`} className="border-b border-black/[0.07]">
        <td className="px-4 py-3"><a href={`https://appsprint.app${row.page}`} target="_blank" rel="noreferrer" className="font-medium hover:underline">{row.pageLabel}</a><div className="mt-1 text-xs text-muted-foreground">{row.position ?? placements[row.placement] ?? row.placement}</div></td>
        <td className="max-w-xs px-4 py-3"><span className="font-medium">{row.variant === "control" ? "A" : "B"}</span> · {row.label}</td>
        <td className="px-4 py-3 text-right tabular-nums">{row.eligibleVisitors?.toLocaleString() ?? "—"}</td>
        <td className="px-4 py-3 text-right tabular-nums">{row.viewers.toLocaleString()}</td>
        <td className="px-4 py-3 text-right tabular-nums">{row.clickers.toLocaleString()}</td>
        <td className="px-4 py-3 text-right font-semibold tabular-nums">{row.eligibleVisitors ? `${(100 * row.clickers / row.eligibleVisitors).toFixed(1)}%` : "—"}</td>
        <td className="px-4 py-3 text-right tabular-nums">{row.viewers ? `${(100 * row.clickers / row.viewers).toFixed(1)}%` : "—"}</td>
        <td className="px-4 py-3 text-right tabular-nums">{row.checkoutVisitors.toLocaleString()}</td>
        <td className="px-4 py-3 text-right tabular-nums">{row.paidVisitors.toLocaleString()}</td>
      </tr>)}{!visible.length ? <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">CTA experiment data is not available yet.</td></tr> : null}</tbody>
    </table></div>
    <p className="px-4 py-3 text-xs leading-5 text-muted-foreground">Eligible visitors include everyone assigned on the page, even without a lookup or a visible CTA. Compare clicks per eligible visitor; clicks per CTA viewer describes the people who saw it. Checkout and paid visitors follow the most recent CTA click within seven days, with both events in this period. Both revenue-checker messages appear immediately after the estimates. The test compares each headline, explanation and button as a package.</p>
  </DashboardCard>;
}
