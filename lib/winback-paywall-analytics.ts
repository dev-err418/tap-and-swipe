export type WinbackPaywallRow = { source: string; productId: string; viewers: number; buyers: number; conversionRate: number | null };

export type WinbackPaywallReport = {
  status: "ready" | "empty" | "setup_required" | "unavailable" | "limited";
  windowStart: string;
  windowEnd: string;
  viewers: number;
  buyers: number;
  conversionRate: number | null;
  sources: WinbackPaywallRow[];
  products: WinbackPaywallRow[];
  note?: string;
  versionComparison?: { before: WinbackPaywallReport; after: WinbackPaywallReport; excludedUsers: number };
  versionComparisonError?: string;
};

type GroupedEvent = { userId: string; source: string; productId: string; views: number; purchases: number; firstView: number; lastPurchase: number };

function summarize(rows: GroupedEvent[], key: "source" | "productId"): WinbackPaywallRow[] {
  const groups = new Map<string, { viewers: Set<string>; buyers: Set<string> }>();
  for (const row of rows) {
    if (row.views < 1 || !row.userId || !row.productId) continue;
    const label = row[key] || "Unknown";
    const group = groups.get(label) ?? { viewers: new Set<string>(), buyers: new Set<string>() };
    group.viewers.add(row.userId);
    if (row.purchases > 0 && row.lastPurchase >= row.firstView) group.buyers.add(row.userId);
    groups.set(label, group);
  }
  return [...groups].map(([label, group]) => ({
    source: key === "source" ? label : "",
    productId: key === "productId" ? label : "",
    viewers: group.viewers.size,
    buyers: group.buyers.size,
    conversionRate: group.viewers.size ? group.buyers.size / group.viewers.size : null,
  })).sort((a, b) => b.viewers - a.viewers || (a.source || a.productId).localeCompare(b.source || b.productId));
}

export function summarizeWinbackPaywall(rows: GroupedEvent[], windowStart: string, windowEnd: string): WinbackPaywallReport {
  const viewers = new Set<string>();
  const buyers = new Set<string>();
  for (const row of rows) {
    if (row.views < 1 || !row.userId || !row.productId) continue;
    viewers.add(row.userId);
    if (row.purchases > 0 && row.lastPurchase >= row.firstView) buyers.add(row.userId);
  }
  return {
    status: viewers.size ? "ready" : "empty", windowStart, windowEnd,
    viewers: viewers.size, buyers: buyers.size,
    conversionRate: viewers.size ? buyers.size / viewers.size : null,
    sources: summarize(rows, "source"), products: summarize(rows, "productId"),
  };
}
