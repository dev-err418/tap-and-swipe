import { DashboardCard } from "./DashboardCard";
import { JourneyVersionComparison } from "./UserJourneyFunnel";
import { experimentCohortLabel } from "@/lib/app-experiment-cohort";
import type { VersyYearlyPriceComparison } from "@/lib/versy-yearly-price-cohorts";
import { AppuReadinessIndicator } from "./AppuReadinessIndicator";
import type { PaywallCohortComparison } from "@/lib/glow-paywall-cohort-comparisons";

function PriceTestCard({ title, allocation, description, report }: {
  title: string; allocation: string; description: string; report: PaywallCohortComparison | undefined;
}) {
  return <DashboardCard title={title} contentClassName="pt-0"
    titleAccessory={report && report.status !== "unavailable" ? <AppuReadinessIndicator cohorts={report.rows} /> : null}
    action={<span className="text-xs text-muted-foreground">{allocation} · {experimentCohortLabel("versy")}</span>}>
    <p className="pb-2 text-xs text-muted-foreground">{description} Worldwide test; euro prices shown are for France and Germany. Other storefronts use localized prices.</p>
    {!report || report.status === "unavailable"
      ? <p role="status" className="py-2 text-sm text-muted-foreground">Price reporting is unavailable. Refresh to retry.</p>
      : <>
        {report.status === "empty" && <p className="pb-2 text-xs text-muted-foreground">No eligible assignments recorded yet.</p>}
        {report.warnings.map((warning) => <p key={warning} role="status" className="pb-2 text-xs text-muted-foreground">{warning}</p>)}
        <JourneyVersionComparison cohorts={report.rows} rowLabels={report.labels} rowHeading="Price"
          allUsersOnly showAppuComparison showArpuGraph showInstallPaid showRefundRate />
      </>}
  </DashboardCard>;
}

export default function VersyYearlyPriceTable({ report }: { report: VersyYearlyPriceComparison | null }) {
  return <>
    <PriceTestCard title="Yearly prices · A/B test" allocation="Equal thirds" report={report?.current}
      description="Main annual offer: €39.99 / €44.99 / €49.99, with a 7-day trial for eligible users." />
    <PriceTestCard title="Recovery prices · A/B test" allocation="50/50 · independent" report={report?.recovery}
      description="Recovery annual offer: €19.99 / €24.99, without a trial. Results include all assigned users and their subsequent purchases, including main offers—not only users who see recovery." />
    <DashboardCard title="Yearly price · historical fixed $49.99" contentClassName="pt-0"
      action={<span className="text-xs text-muted-foreground">Historical 100% rollout · {experimentCohortLabel("versy")}</span>}>
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
        {report.warnings.map((warning) => <p key={warning} role="status" className="pb-2 text-xs text-muted-foreground">{warning}</p>)}
        <JourneyVersionComparison cohorts={report.rows} rowLabels={report.labels} rowHeading="Price"
          allUsersOnly showAppuComparison showArpuGraph showInstallPaid showRefundRate />
      </>}
    </DashboardCard>
  </>;
}
