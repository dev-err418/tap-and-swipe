"use client";

import VersyPaywallNotePanel from "./VersyPaywallNotePanel";
import { DashboardCard } from "./DashboardCard";
import { JourneyVersionComparison } from "./UserJourneyFunnel";
import { experimentCohortLabel } from "@/lib/app-experiment-cohort";
import type { VersyPaywallComparison } from "@/lib/versy-paywall-comparison";
export default function VersyPaywallComparisonPanel({ report }: { report: VersyPaywallComparison | null }) {
  return <>
    {report?.scrollAccess && <DashboardCard title="Scroll paywall · 50% hard / 50% current soft" contentClassName="pt-0">
      {report.scrollAccess.overall.status === "empty" && <p className="pb-3 text-sm text-muted-foreground">Waiting for the next app release and new enrollments.</p>}
      <JourneyVersionComparison cohorts={report.scrollAccess.overall.rows} rowLabels={report.scrollAccess.overall.labels} rowHeading="Paywall"
        allUsersOnly showInstallPaid showRefundRate />
      <p className="pb-2 pt-4 text-xs font-medium">By Scroll variant</p>
      <JourneyVersionComparison cohorts={report.scrollAccess.flows.rows} rowLabels={report.scrollAccess.flows.labels} rowHeading="Paywall"
        allUsersOnly showInstallPaid showRefundRate />
    </DashboardCard>}
    <DashboardCard title="Onboarding paywalls" contentClassName="pt-0"
    action={<span className="text-xs text-muted-foreground">{experimentCohortLabel("versy")}</span>}>
    {!report || report.status === "unavailable"
      ? <p role="status" className="py-2 text-sm text-muted-foreground">Paywall comparison is unavailable. Refresh to retry.</p>
      : <>
        {report.warnings.filter((warning) => !/^\d+ invalid original onboarding records were excluded\.$/.test(warning)).map((warning) => <p key={warning} role="status" className="pb-2 text-xs text-muted-foreground">{warning}</p>)}
        <JourneyVersionComparison cohorts={report.rows} rowLabels={report.labels} rowHeading="Paywall"
          allUsersOnly showInstallPaid showRefundRate />
      </>}
  </DashboardCard>
    {report?.noteExperiment && <VersyPaywallNotePanel report={report.noteExperiment} />}
  </>;
}
