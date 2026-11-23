import type { GlowPaywallCohortComparisons } from "@/lib/glow-paywall-cohort-comparisons";
import {
  GLOW_FRANCE_PRICE_START_DATE, GLOW_FRANCE_PRICE_START_MS,
  GLOW_FRANCE_RECOVERY_PRICES, GLOW_FRANCE_YEARLY_PRICES,
} from "@/lib/native-paywall-allocation";
import { AppuReadinessIndicator } from "./AppuReadinessIndicator";
import { DashboardCard } from "./DashboardCard";
import { JourneyVersionComparison } from "./UserJourneyFunnel";

const priceStartLabel = new Intl.DateTimeFormat("en-GB", {
  day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris",
}).format(GLOW_FRANCE_PRICE_START_MS);
const yearlyLabels = Object.fromEntries(GLOW_FRANCE_YEARLY_PRICES.map(({ id, price }) => [id, price]));
const unavailableRows = GLOW_FRANCE_YEARLY_PRICES.map(({ id }) => ({ version: id, installs: 0, tracked: 0, variants: [] }));

export default function GlowPaywallCohortTables({ report }: { report: GlowPaywallCohortComparisons | null }) {
  const comparison = report?.francePrices;
  const available = comparison && comparison.status !== "unavailable";

  return <>
    <DashboardCard title="Yearly prices · A/B test" contentClassName="pt-0"
      titleAccessory={available ? <AppuReadinessIndicator cohorts={comparison.rows} /> : null}
      action={<span className="text-xs text-muted-foreground">
        France · Equal thirds · 7-day trials · Since <time dateTime={GLOW_FRANCE_PRICE_START_DATE}>{priceStartLabel}</time>
      </span>}>
      {!available && <p role="status" className="pb-2 text-xs text-muted-foreground">Yearly price reporting is unavailable. Refresh to retry.</p>}
      {comparison?.warnings.map((warning) => <p key={warning} role="status" className="pb-2 text-xs text-muted-foreground">{warning}</p>)}
      <JourneyVersionComparison cohorts={available ? comparison.rows : unavailableRows} rowLabels={yearlyLabels} rowHeading="Price"
        allUsersOnly showAppuComparison showArpuGraph showInstallPaid showRefundRate />
    </DashboardCard>
    <DashboardCard title="Recovery prices" contentClassName="pt-0"
      action={<span className="text-xs text-muted-foreground">France · No trial</span>}>
      <dl className="divide-y divide-foreground/[0.06] rounded-xl border border-foreground/[0.06]">
        {Object.entries(GLOW_FRANCE_RECOVERY_PRICES).map(([offer, price]) => (
          <div key={offer} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-xs">
            <dt className="font-medium tabular-nums">{price}</dt>
            <dd className="text-muted-foreground">
              After closing or cancelling {GLOW_FRANCE_YEARLY_PRICES.filter((plan) => plan.recovery === offer)
                .map((plan) => plan.price).join(" or ")}
            </dd>
          </div>
        ))}
      </dl>
    </DashboardCard>
  </>;
}
