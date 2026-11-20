import { DashboardCard } from "./DashboardCard";
import { JourneyVersionComparison } from "./UserJourneyFunnel";
import { experimentCohortLabel } from "@/lib/app-experiment-cohort";
import { VERSY_PRICE_TEST_START_ISO, type VersyYearlyPriceComparison } from "@/lib/versy-yearly-price-cohorts";
import { AppuReadinessIndicator } from "./AppuReadinessIndicator";
import type { PaywallCohortComparison } from "@/lib/glow-paywall-cohort-comparisons";

const priceTestStartLabel = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  timeZone: "UTC", hourCycle: "h23",
}).format(new Date(VERSY_PRICE_TEST_START_ISO));

function PriceTestCard({ title, allocation, report, recovery = false }: {
  title: string; allocation: string; report: PaywallCohortComparison | undefined; recovery?: boolean;
}) {
  return <DashboardCard title={title} contentClassName="pt-0"
    titleAccessory={report && report.status !== "unavailable" ? <AppuReadinessIndicator cohorts={report.rows} /> : null}
    action={<span className="text-xs text-muted-foreground"
      title={recovery ? "Recovery purchases have no trial. These cohorts include all assigned users; paid conversion, APPU and refunds include subsequent purchases from any offer, including the main offer." : undefined}>
      {allocation}{recovery ? " · no trial · all offers" : ""} · {experimentCohortLabel("versy")}
      <time className="ml-2 whitespace-nowrap" dateTime={VERSY_PRICE_TEST_START_ISO}
        title="Only users installed and assigned on or after this cutoff enter the current price tests.">
        Since {priceTestStartLabel} UTC
      </time></span>}>
    {!report || report.status === "unavailable"
      ? <p role="status" className="py-2 text-sm text-muted-foreground">Price reporting is unavailable. Refresh to retry.</p>
      : <>
        {report.warnings.map((warning) => <p key={warning} role="status" className="pb-2 text-xs text-muted-foreground">{warning}</p>)}
        <JourneyVersionComparison cohorts={report.rows} rowLabels={report.labels} rowHeading="Price"
          allUsersOnly showAppuComparison showArpuGraph showInstallPaid showRefundRate showTrialConversions={!recovery} />
      </>}
  </DashboardCard>;
}

export default function VersyYearlyPriceTable({ report }: { report: VersyYearlyPriceComparison | null }) {
  return <>
    <PriceTestCard title="Yearly prices · A/B test" allocation="Equal thirds" report={report?.current} />
    <PriceTestCard title="Recovery prices · A/B test" allocation="50/50 · independent" recovery report={report?.recovery} />
  </>;
}
