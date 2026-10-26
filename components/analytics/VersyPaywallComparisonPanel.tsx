"use client";

import { DashboardCard } from "./DashboardCard";
import { JourneyVersionComparison } from "./UserJourneyFunnel";
import { experimentCohortLabel } from "@/lib/app-experiment-cohort";
import type { VersyPaywallComparison } from "@/lib/versy-paywall-comparison";

export default function VersyPaywallComparisonPanel({ report }: { report: VersyPaywallComparison | null }) {
  return <DashboardCard title="Onboarding paywalls · 7-day trials" contentClassName="pt-0"
    action={<span className="text-xs text-muted-foreground">{experimentCohortLabel("versy")}</span>}>
    {!report || report.status === "unavailable"
      ? <p role="status" className="py-2 text-sm text-muted-foreground">Paywall comparison is unavailable. Refresh to retry.</p>
      : <>
        {report.warnings.map((warning) => <p key={warning} role="status" className="pb-2 text-xs text-muted-foreground">{warning}</p>)}
        <JourneyVersionComparison cohorts={report.rows} rowLabels={report.labels} rowHeading="Paywall"
          allUsersOnly showInstallPaid showRefundRate />
      </>}
  </DashboardCard>;
}
