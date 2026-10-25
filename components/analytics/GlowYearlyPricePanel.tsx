import type { NativePaywallReport } from "@/lib/native-paywall-analytics";
import { GLOW_YEARLY_PRICE_EXPERIMENT, GLOW_YEARLY_PRICES } from "@/lib/native-paywall-allocation";
import { AppExperimentLayout } from "./AppExperimentLayout";
import { NativePaywallResultsTable } from "./NativePaywallsPanel";

export default function GlowYearlyPricePanel({ report }: { report: NativePaywallReport | null }) {
  const group = report?.groups.find((group) => group.experiment === GLOW_YEARLY_PRICE_EXPERIMENT.id && group.language === "all");
  return <AppExperimentLayout title="Yearly price comparison" label="Yearly price" subtitle="Six equal price/trial combinations · independent of onboarding and paywall flow">
    <p className="px-4 py-3 text-xs text-muted-foreground">{GLOW_YEARLY_PRICES.map(({ price }) => price).join(" · ")}. Each price/trial combination receives one-sixth of new assignments. US reference prices; local StoreKit prices may differ.</p>
    {!report || report.status === "unavailable"
      ? <p role="status" className="px-4 py-4 text-sm text-muted-foreground">Yearly price reporting is unavailable. Refresh to retry.</p>
      : <>
        {report.warnings.map((warning) => <p role="status" key={warning} className="px-4 py-3 text-sm text-muted-foreground">{warning}</p>)}
        {group ? <NativePaywallResultsTable title="Yearly prices" rows={group.paywalls} experiment={group.experiment} language="all" showGlowYearlyPrice showPaidUsers />
          : <p role="status" className="px-4 py-4 text-sm text-muted-foreground">No production assignments for the new yearly price test yet. Historical price tests stay in Paywalls.</p>}
      </>}
    <p className="px-4 py-3 text-xs text-muted-foreground">All languages and app placements; assigned users include non-payers. Weekly is a fixed alternative in the Versy reminder flow, not a fourth price arm. Its verified purchases, renewals and refunds remain attributed to the saved yearly-price assignment. Free trials count as conversions; paid users require a paid charge. Recovery offers are reported separately in Paywalls.</p>
  </AppExperimentLayout>;
}
