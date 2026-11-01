import type { NativePaywallReport } from "@/lib/native-paywall-analytics";
import { GLOW_YEARLY_PRICE_EXPERIMENT } from "@/lib/native-paywall-allocation";
import { AppExperimentLayout } from "./AppExperimentLayout";
import { NativePaywallResultsTable } from "./NativePaywallsPanel";

export default function GlowYearlyPricePanel({ report }: { report: NativePaywallReport | null }) {
  const group = report?.groups.find((group) => group.experiment === GLOW_YEARLY_PRICE_EXPERIMENT.id && group.language === "all");
  return <AppExperimentLayout title="Yearly price comparison" label="Yearly price" subtitle="Six equal price/trial combinations · independent of onboarding and paywall flow">
    {!report || report.status === "unavailable"
      ? <p role="status" className="px-4 py-4 text-sm text-muted-foreground">Yearly price reporting is unavailable. Refresh to retry.</p>
      : <>
        {report.warnings.map((warning) => <p role="status" key={warning} className="px-4 py-3 text-sm text-muted-foreground">{warning}</p>)}
        {group ? <NativePaywallResultsTable title="Yearly prices" rows={group.paywalls} experiment={group.experiment} language="all" showGlowYearlyPrice showPaidUsers />
          : <p role="status" className="px-4 py-4 text-sm text-muted-foreground">No production assignments for the new yearly price test yet. Historical price tests stay in Paywalls.</p>}
      </>}
  </AppExperimentLayout>;
}
