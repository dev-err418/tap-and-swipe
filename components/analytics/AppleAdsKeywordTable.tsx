import type { AppleAdsKeywordReport } from "@/lib/apple-ads-keyword-analytics";
import { DashboardCard } from "./DashboardCard";

const money = (amount: number) => amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
const percent = (numerator: number, denominator: number) => denominator ? `${(100 * numerator / denominator).toFixed(1)}%` : "—";

export default function AppleAdsKeywordTable({ report, country, windowLabel }: {
  report: AppleAdsKeywordReport | null | undefined; country: string; windowLabel: string;
}) {
  const rows = country === "all" ? report?.rows : report?.countries[country] ?? [];
  return <DashboardCard title="Apple Ads keywords" contentClassName="pt-0">
    <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
      {windowLabel} · Superwall first-launch cohorts, with attributed subscription revenue through the latest refresh.
      Superwall provides spend at campaign level, not by keyword, so keyword spend and ROAS are unavailable. Bids are not spend.
    </p>
    {!report?.available ? <p className="py-4 text-sm text-muted-foreground">Keyword data is temporarily unavailable.</p>
      : !rows?.length ? <p className="py-4 text-sm text-muted-foreground">No Apple Ads keyword-attributed users in this selection.</p>
      : <div className="overflow-x-auto">
        <table className="w-full text-left text-xs" style={{ minWidth: 960 }}>
          <thead className="border-b border-foreground/[0.08] text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-3 font-medium">Keyword</th>
              <th scope="col" className="px-3 py-3 text-right font-medium" title="Unique Superwall first-launch users with positive Apple Ads attribution">Users</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">Trials</th>
              <th scope="col" className="px-3 py-3 text-right font-medium" title="Trial-start users divided by all attributed users">Trial rate</th>
              <th scope="col" className="px-3 py-3 text-right font-medium" title="Paid conversions divided by trials whose recorded trial period ended">Trial → paid</th>
              <th scope="col" className="px-3 py-3 text-right font-medium" title="Unique users with a recorded paid purchase, including direct purchases">Paid users</th>
              <th scope="col" className="px-3 py-3 text-right font-medium" title="Paid users divided by all attributed users">Paid CR</th>
              <th scope="col" className="px-3 py-3 text-right font-medium" title="Net subscription proceeds attributed to users acquired by this keyword">Attributed net revenue</th>
              <th scope="col" className="px-3 py-3 text-right font-medium" title="Net proceeds divided by every user in the cohort, including nonpayers">APPU</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">Spend</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">ROAS</th>
            </tr>
          </thead>
          <tbody>{rows.map((row) => <tr key={row.key} className="border-b border-foreground/[0.05] last:border-0">
            <td className="px-3 py-3"><span className="font-medium text-foreground">{row.keyword}</span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">Campaign {row.campaignId}</span></td>
            <td className="px-3 py-3 text-right tabular-nums">{row.users}</td>
            <td className="px-3 py-3 text-right tabular-nums">{row.trials}</td>
            <td className="px-3 py-3 text-right tabular-nums">{percent(row.trials, row.users)}</td>
            <td className="px-3 py-3 text-right tabular-nums" title={`${row.convertedTrials} paid / ${row.finishedTrials} finished trials`}>
              {row.missingMoney ? "—" : percent(row.convertedTrials, row.finishedTrials)} <span className="text-muted-foreground">({row.convertedTrials}/{row.finishedTrials})</span></td>
            <td className="px-3 py-3 text-right tabular-nums">{row.missingMoney ? "—" : row.paidUsers}</td>
            <td className="px-3 py-3 text-right tabular-nums">{row.missingMoney ? "—" : percent(row.paidUsers, row.users)}</td>
            <td className="px-3 py-3 text-right tabular-nums">{row.missingMoney ? "—" : money(row.proceeds)}</td>
            <td className="px-3 py-3 text-right font-semibold tabular-nums">{row.missingMoney || !row.users ? "—" : money(row.proceeds / row.users)}</td>
            <td className="px-3 py-3 text-right text-muted-foreground">—</td><td className="px-3 py-3 text-right text-muted-foreground">—</td>
          </tr>)}</tbody>
        </table>
      </div>}
    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
      Users are attributed first launches, not Apple download counts. APPU includes nonpayers; paid users include direct purchases.
      Trial-to-paid uses ended trials only. Proceeds include recorded renewals and refunds, in USD; attribution and recent outcomes may be delayed.
      {report?.excludedConflictingAttribution ? ` ${report.excludedConflictingAttribution} users with conflicting Meta attribution are excluded.` : ""}
    </p>
  </DashboardCard>;
}
