import { DashboardCard } from "./DashboardCard";
import { JourneyVersionComparison } from "./UserJourneyFunnel";
import { experimentCohortLabel } from "@/lib/app-experiment-cohort";
import type { VersyYearlyPriceComparison } from "@/lib/versy-yearly-price-cohorts";
import { AppuReadinessIndicator } from "./AppuReadinessIndicator";

export default function VersyYearlyPriceTable({ report }: { report: VersyYearlyPriceComparison | null }) {
  return <>
    <DashboardCard title="Yearly price · fixed $49.99" contentClassName="pt-0"
      action={<span className="text-xs text-muted-foreground">100% rollout · {experimentCohortLabel("versy")}</span>}>
      <p className="pb-3 text-xs text-muted-foreground">Next app build: one yearly price for everyone. Outcomes start at the fixed-price assignment, including non-payers. US reference price; StoreKit supplies localized prices and trial eligibility. This is a rollout, with no A/B winner.</p>
      {!report || report.rollout.status === "unavailable"
        ? <p role="status" className="py-2 text-sm text-muted-foreground">Fixed yearly price reporting is unavailable. Refresh to retry.</p>
        : <>
          {report.rollout.status === "empty" && <p className="pb-2 text-xs text-muted-foreground">No eligible fixed-price assignments recorded yet.</p>}
          {report.rollout.warnings.map((warning) => <p key={warning} role="status" className="pb-2 text-xs text-muted-foreground">{warning}</p>)}
          <JourneyVersionComparison cohorts={report.rollout.rows} rowLabels={report.rollout.labels} rowHeading="Price"
            allUsersOnly showInstallPaid showRefundRate />
        </>}
    </DashboardCard>
    <DashboardCard title="Yearly prices · historical test" contentClassName="pt-0"
    titleAccessory={report && report.status !== "unavailable" ? <AppuReadinessIndicator cohorts={report.rows} /> : null}
    action={<span className="text-xs text-muted-foreground">{experimentCohortLabel("versy")}</span>}>
    {!report || report.status === "unavailable"
      ? <p role="status" className="py-2 text-sm text-muted-foreground">Yearly price reporting is unavailable. Refresh to retry.</p>
      : <>
        <p className="pb-3 text-xs text-muted-foreground">Retired $39.99 / $49.99 test. Only records still carrying the old randomized assignments appear here; upgraded fixed-price users are excluded. Historical purchase attribution remains in the native paywall report.</p>
        {report.warnings.map((warning) => <p key={warning} role="status" className="pb-2 text-xs text-muted-foreground">{warning}</p>)}
        <JourneyVersionComparison cohorts={report.rows} rowLabels={report.labels} rowHeading="Price"
          allUsersOnly showAppuComparison showArpuGraph showInstallPaid showRefundRate />
      </>}
    </DashboardCard>
  </>;
}
