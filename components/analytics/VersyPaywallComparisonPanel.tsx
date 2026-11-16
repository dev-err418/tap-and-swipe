"use client";

import VersyPaywallNotePanel from "./VersyPaywallNotePanel";
import { DashboardCard } from "./DashboardCard";
import { JourneyVersionComparison } from "./UserJourneyFunnel";
import { experimentCohortLabel } from "@/lib/app-experiment-cohort";
import type { VersyPaywallComparison } from "@/lib/versy-paywall-comparison";
import type { PaywallCohortComparison } from "@/lib/glow-paywall-cohort-comparisons";

function MatureScrollAccessTable({ report }: { report: PaywallCohortComparison }) {
  const money = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
  return <div className="min-w-0 overflow-x-auto rounded-xl border border-foreground/[0.06] scrollbar-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" role="region" aria-label="Scroll paywall mature proceeds" tabIndex={0}>
    <table className="w-full min-w-[696px] text-left text-xs">
    <thead className="bg-analytics-subtle"><tr className="text-muted-foreground">
      <th scope="col" className="sticky left-0 z-10 min-w-32 bg-analytics-subtle px-4 py-3 font-medium text-foreground">Paywall</th>
      <th scope="col" className="min-w-24 whitespace-nowrap border-l border-foreground/[0.06] px-3 py-3 text-right font-medium">Mature installs</th>
      {["Net proceeds", "Proceeds / mature install", "Meta proceeds / mature install"].map((label) =>
        <th key={label} scope="col" className="min-w-28 whitespace-nowrap px-3 py-3 text-right font-medium">{label}</th>)}
    </tr></thead>
    <tbody>{report.rows.map((row) => {
      const mature = row.conversions?.global.realizedAppu;
      const meta = row.conversions?.metaAds.realizedAppu;
      return <tr key={row.version} className="border-t border-foreground/[0.06]">
        <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-card px-4 py-4 font-medium">{report.labels[row.version]}</th>
        <td className="border-l border-foreground/[0.06] px-3 py-4 text-right tabular-nums">{(mature?.users ?? 0).toLocaleString("en-US")}</td>
        <td className="whitespace-nowrap px-3 py-4 text-right tabular-nums">{mature?.users && !mature.missingMoney ? money(mature.proceeds) : "—"}</td>
        <td className="whitespace-nowrap px-3 py-4 text-right tabular-nums">{mature?.users && !mature.missingMoney ? money(mature.proceeds / mature.users) : "—"}</td>
        <td className="whitespace-nowrap px-3 py-4 text-right tabular-nums">{meta?.users && !meta.missingMoney ? `${money(meta.proceeds / meta.users)} (${meta.users} installs)` : "—"}</td>
      </tr>;
    })}</tbody>
  </table></div>;
}

export default function VersyPaywallComparisonPanel({ report }: { report: VersyPaywallComparison | null }) {
  return <>
    {report?.scrollAccess && <DashboardCard title="Scroll paywall · 50% hard / 50% current soft" contentClassName="pt-0">
      {report.scrollAccess.overall.status === "empty" && <p className="pb-3 text-sm text-muted-foreground">Waiting for the next app release and new enrollments.</p>}
      <MatureScrollAccessTable report={report.scrollAccess.overall} />
      <p className="pb-2 pt-4 text-xs font-medium">By Scroll variant</p>
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
