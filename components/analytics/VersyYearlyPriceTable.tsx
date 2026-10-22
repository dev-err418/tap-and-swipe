import { DashboardCard } from "./DashboardCard";
import { JourneyVersionComparison } from "./UserJourneyFunnel";
import { experimentCohortLabel } from "@/lib/app-experiment-cohort";
import type { PaywallCohortComparison } from "@/lib/glow-paywall-cohort-comparisons";

export default function VersyYearlyPriceTable({ report }: { report: PaywallCohortComparison | null }) {
  return <DashboardCard title="Yearly prices" contentClassName="pt-0"
    action={<span className="text-xs text-muted-foreground">{experimentCohortLabel("versy")}</span>}>
    {!report || report.status === "unavailable"
      ? <p role="status" className="py-2 text-sm text-muted-foreground">Yearly price reporting is unavailable. Refresh to retry.</p>
      : <>
        {report.warnings.map((warning) => <p key={warning} role="status" className="pb-2 text-xs text-muted-foreground">{warning}</p>)}
        <JourneyVersionComparison cohorts={report.rows} rowLabels={report.labels} rowHeading="Price"
          allUsersOnly showAppuComparison showArpuGraph showInstallPaid showRefundRate />
      </>}
  </DashboardCard>;
}
