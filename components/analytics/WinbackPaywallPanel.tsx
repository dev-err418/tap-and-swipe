"use client";

import { useEffect, useState } from "react";
import type { WinbackPaywallReport, WinbackPaywallRow } from "@/lib/winback-paywall-analytics";
import { DASHBOARD_SURFACE_CLASS } from "./dashboard-surface";
import { cn } from "@/lib/utils";

const count = (value: number) => value.toLocaleString("en-US");
const rate = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1)}%`;

export default function WinbackPaywallPanel({ appId }: { appId: "glow" | "versy" }) {
  const [report, setReport] = useState<WinbackPaywallReport | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ appId });
    fetch(`/api/analytics/winback-paywall?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Offer analytics failed to load");
        return response.json() as Promise<WinbackPaywallReport>;
      })
      .then(setReport)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailed(true);
      });
    return () => controller.abort();
  }, [appId]);

  return <section aria-label="50% win-back offer" className="space-y-2">
    <div className="px-1">
      <h2 className="text-sm font-semibold">50% win-back offer</h2>
      <p className="text-xs text-muted-foreground">Production · last 30 days · verified purchases after an offer view</p>
    </div>
    <div className={cn(DASHBOARD_SURFACE_CLASS, "p-5")}>
      {failed || report?.status === "unavailable" || report?.status === "limited" || report?.status === "setup_required"
        ? <p className="text-sm text-muted-foreground">{report?.note ?? "Offer analytics could not be loaded. Refresh to retry."}</p>
        : !report ? <p className="text-sm text-muted-foreground">Loading offer analytics…</p>
        : <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Viewers" value={count(report.viewers)} />
            <Metric label="Purchasers" value={count(report.buyers)} />
            <Metric label="View → purchase" value={rate(report.conversionRate)} />
          </div>
          {report.status === "empty" ? <p className="text-sm text-muted-foreground">No production offer views in this period yet.</p> : <>
            <Breakdown title="Placement / source" rows={report.sources} label={(row) => row.source} />
            <Breakdown title="Yearly product" rows={report.products} label={(row) => row.productId} />
          </>}
          <p className="text-xs text-muted-foreground">Each person counts once per row. Purchases count only when the same person bought the yearly product after viewing its 50% offer in this period. Revenue and refunds are not attributed to this offer here.</p>
        </div>}
    </div>
  </section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p></div>;
}

function Breakdown({ title, rows, label }: { title: string; rows: WinbackPaywallRow[]; label: (row: WinbackPaywallRow) => string }) {
  return <div className="min-w-0 overflow-x-auto">
    <h3 className="mb-2 text-sm font-semibold">{title}</h3>
    <table className="w-full min-w-[25rem] text-left text-sm">
      <thead className="border-b border-black/10 text-xs text-muted-foreground"><tr>
        <th className="py-2 font-medium">{title}</th><th className="py-2 text-right font-medium">Viewers</th>
        <th className="py-2 text-right font-medium">Purchasers</th><th className="py-2 text-right font-medium">Conversion</th>
      </tr></thead>
      <tbody>{rows.map((row) => <tr key={label(row)} className="border-b border-black/[0.06] last:border-0">
        <td className="py-2 pr-3">{label(row)}</td><td className="py-2 text-right tabular-nums">{count(row.viewers)}</td>
        <td className="py-2 text-right tabular-nums">{count(row.buyers)}</td><td className="py-2 text-right tabular-nums">{rate(row.conversionRate)}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}
