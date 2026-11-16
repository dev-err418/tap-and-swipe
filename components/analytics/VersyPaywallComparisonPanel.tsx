"use client";

import VersyPaywallNotePanel from "./VersyPaywallNotePanel";
import { DashboardCard } from "./DashboardCard";
import { JourneyVersionComparison } from "./UserJourneyFunnel";
import { experimentCohortLabel } from "@/lib/app-experiment-cohort";
import type { VersyPaywallComparison } from "@/lib/versy-paywall-comparison";
import type { PaywallCohortComparison } from "@/lib/glow-paywall-cohort-comparisons";

function MatureScrollAccessTable({ report }: { report: PaywallCohortComparison }) {
  const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  return <div className="overflow-x-auto"><table className="w-full text-sm">
    <thead><tr>{["Paywall", "Mature installs", "Net proceeds", "Proceeds / mature install", "Meta proceeds / mature install"].map((label) =>
      <th key={label} className="whitespace-nowrap px-3 py-3 text-left font-medium">{label}</th>)}</tr></thead>
    <tbody>{report.rows.map((row) => {
      const mature = row.conversions?.global.realizedAppu;
      const meta = row.conversions?.metaAds.realizedAppu;
      return <tr key={row.version} className="border-t">
        <th scope="row" className="px-3 py-3 text-left font-medium">{report.labels[row.version]}</th>
        <td className="px-3 py-3">{mature?.users ?? 0}</td>
        <td className="px-3 py-3">{mature?.users && !mature.missingMoney ? money(mature.proceeds) : "—"}</td>
        <td className="px-3 py-3">{mature?.users && !mature.missingMoney ? money(mature.proceeds / mature.users) : "—"}</td>
        <td className="px-3 py-3">{meta?.users && !meta.missingMoney ? `${money(meta.proceeds / meta.users)} (${meta.users} installs)` : "—"}</td>
      </tr>;
    })}</tbody>
  </table></div>;
}

export default function VersyPaywallComparisonPanel({ report }: { report: VersyPaywallComparison | null }) {
  return <>
    {report?.scrollAccess && <DashboardCard title="Scroll paywall · 50% hard / 50% current soft" contentClassName="pt-0">
      <p className="py-3 text-xs text-muted-foreground">New Welcome enrollments only. Proceeds and installs both exclude ongoing trial windows; mature non-payers remain included. Trial starters wait until their recorded expiry. Countries follow the selected market.</p>
      {report.scrollAccess.overall.status === "empty" && <p className="pb-3 text-sm text-muted-foreground">Waiting for the next app release and new enrollments.</p>}
      <MatureScrollAccessTable report={report.scrollAccess.overall} />
      <p className="pt-3 text-sm font-medium">By Scroll variant</p>
      <MatureScrollAccessTable report={report.scrollAccess.flows} />
    </DashboardCard>}
    <DashboardCard title="Onboarding paywalls" contentClassName="pt-0"
    action={<span className="text-xs text-muted-foreground">{experimentCohortLabel("versy")}</span>}>
    {!report || report.status === "unavailable"
      ? <p role="status" className="py-2 text-sm text-muted-foreground">Paywall comparison is unavailable. Refresh to retry.</p>
      : <>
        {report.warnings.map((warning) => <p key={warning} role="status" className="pb-2 text-xs text-muted-foreground">{warning}</p>)}
        <JourneyVersionComparison cohorts={report.rows} rowLabels={report.labels} rowHeading="Paywall"
          allUsersOnly showInstallPaid showRefundRate />
      </>}
  </DashboardCard>
    {report?.noteExperiment && <VersyPaywallNotePanel report={report.noteExperiment} />}
  </>;
}
