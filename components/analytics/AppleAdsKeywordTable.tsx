import type { AppleAdsKeywordReport, AppleAdsKeywordRow } from "@/lib/apple-ads-keyword-analytics";
import { cn } from "@/lib/utils";
import { DashboardCard } from "./DashboardCard";
import RealizedAppu from "./RealizedAppu";

const money = (amount: number, currency = "USD") => amount.toLocaleString("en-US", { style: "currency", currency });
const rate = (n: number, d: number) => d > 0 ? n / d : null;
const percent = (value: number | null) => value == null ? "—" : `${(100 * value).toFixed(1)}%`;
const highlight = (value: number | null, values: (number | null)[]) => value != null && value > 0 && !values.some((other) => other != null && other > value);

export default function AppleAdsKeywordTable({ report, country }: {
  report: AppleAdsKeywordReport | null | undefined; country: string; windowLabel: string;
}) {
  const rows = country === "all" ? report?.rows : report?.countries[country] ?? [];
  const value = (row: AppleAdsKeywordRow, kind: "appu" | "trial" | "paid" | "paidCr" | "roas") => {
    if (kind === "trial") return rate(row.trials, row.users);
    if (row.missingMoney) return null;
    if (kind === "paid") return rate(row.convertedTrials, row.finishedTrials);
    if (kind === "paidCr") return rate(row.paidUsers, row.users);
    if (kind === "roas") return row.spendUsd && row.spendUsd > 0 ? row.proceeds / row.spendUsd : null;
    return rate(row.proceeds, row.users);
  };
  const cell = (row: AppleAdsKeywordRow, kind: "appu" | "trial" | "paid" | "paidCr" | "roas") => {
    const metric = value(row, kind);
    const best = highlight(metric, (rows ?? []).map((other) => value(other, kind)));
    const denominator = kind === "paid" ? row.finishedTrials : row.users;
    const numerator = kind === "trial" ? row.trials : kind === "paid" ? row.convertedTrials : row.paidUsers;
    return <td className={cn("whitespace-nowrap px-3 py-2 text-right tabular-nums", best && "bg-analytics-highlight-bg text-analytics-highlight")}
      title={kind === "roas" ? "Attributed USD net proceeds / keyword spend converted with the latest ECB reference rate. Spend uses UTC days and results are provisional." : undefined}>
      <span className="font-semibold">{kind === "appu" ? metric == null ? "—" : money(metric) : percent(metric)}</span>
      {kind === "appu" ? <RealizedAppu metric={row.realizedAppu} /> : null}
      {kind === "roas" ? <span className="ml-1 text-[0.8em] font-normal text-muted-foreground" title="Realized ROAS uses a separate mature acquisition window and its full keyword spend.">({row.realizedRoas == null ? "—" : percent(row.realizedRoas)} realized)</span> : null}
      {kind !== "appu" && kind !== "roas" && metric != null ? <span className={cn("ml-1", best ? "text-analytics-highlight/75" : "text-muted-foreground")}>({numerator} / {denominator})</span> : null}
    </td>;
  };
  return <DashboardCard title="Apple Ads keywords" contentClassName="pt-0">
    {!report?.available ? <p role="status" className="py-2 text-sm text-muted-foreground">Keyword data is temporarily unavailable.</p>
      : !rows?.length ? <p className="py-2 text-sm text-muted-foreground">No Apple Ads keyword-attributed users in this selection.</p>
      : <div className="min-w-0 overflow-x-auto rounded-xl border border-foreground/[0.06] scrollbar-none" role="region" aria-label="Apple Ads keyword performance" tabIndex={0}>
        <table className="w-full text-left text-xs" style={{ minWidth: 1050 }}>
          <thead className="bg-analytics-subtle"><tr className="text-muted-foreground">
            <th scope="col" className="sticky left-0 z-10 min-w-32 bg-analytics-subtle px-4 py-3 font-medium text-foreground">Keyword</th>
            {["Users", "Spend", "APPU", "Trial start", "Trial → paid", "Paid CR", "Attributed net revenue", "ROAS"].map((heading) =>
              <th scope="col" key={heading} className="whitespace-nowrap px-3 py-3 text-right font-medium">{heading}</th>)}
          </tr></thead>
          <tbody>{rows.map((row) => <tr key={row.key} className="border-t border-foreground/[0.06]">
            <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-card px-4 py-2 font-medium">{row.keyword}</th>
            <td className="border-l border-foreground/[0.06] px-3 py-2 text-right tabular-nums">{row.users}</td>
            <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums" title="Apple Ads keyword spend, including taps with no install; UTC reporting dates.">{row.spend == null || !row.spendCurrency ? "—" : money(row.spend, row.spendCurrency)}</td>
            {cell(row, "appu")}{cell(row, "trial")}{cell(row, "paid")}{cell(row, "paidCr")}
            <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums" title="Attributed net proceeds in USD, including recorded renewals and refunds">{row.missingMoney ? "—" : money(row.proceeds)}</td>
            {cell(row, "roas")}
          </tr>)}</tbody>
        </table>
      </div>}
  </DashboardCard>;
}
