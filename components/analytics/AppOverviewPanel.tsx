"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { DEFAULT_APP_LANGUAGE, marketKey, marketCountryLabel, type AnalyticsMarkets } from "@/lib/analytics-markets";
import type { AppCountryComparisons } from "@/lib/app-country-comparisons";
import { APP_ANALYTICS_HEADER_CLASS, DASHBOARD_TAB_ACTIVE_CLASS, DASHBOARD_TAB_CLASS, DASHBOARD_TAB_INACTIVE_CLASS, DASHBOARD_TAB_LIST_CLASS } from "./dashboard-surface";
import { cn } from "@/lib/utils";
import { countryFlag } from "@/lib/stats-helpers";

import type { FunnelTrendPoint } from "@/components/analytics/AppSprintFunnelCharts";
import { totalCohortAppu, overviewForLanguage, overviewLanguageLabel, type AppOverviewCohorts } from "@/lib/app-overview-cohorts";
import AppCountryBreakdown from "@/components/analytics/AppCountryBreakdown";
import AppConversionBreakdown from "@/components/analytics/AppConversionBreakdown";
import type {
  MobileAppCountryRow,
  MobileAppPlanCountryRow,
  MobileAppRetentionCountryRow,
  TrialCancelTiming,
} from "@/lib/mobile-app-analytics";
import TrialCancelChart from "@/components/analytics/TrialCancelChart";
import AppNotesChart from "@/components/analytics/AppNotesChart";
import GlowPaywallCohortTables from "./GlowPaywallCohortTables";
import VersyYearlyPriceTable from "./VersyYearlyPriceTable";
import PokyPaywallFlowTable from "./PokyPaywallFlowTable";
import type { PaywallCohortComparison } from "@/lib/glow-paywall-cohort-comparisons";
import type { GlowPaywallCohortComparisons } from "@/lib/glow-paywall-cohort-comparisons";
import { DashboardCard } from "@/components/analytics/DashboardCard";
import UserJourneyFunnel, { JourneyVersionComparison } from "@/components/analytics/UserJourneyFunnel";
import type { UserJourneyReport } from "@/lib/user-journey";
import { experimentCohortLabel } from "@/lib/app-experiment-cohort";

export default function AppOverviewPanel({
  appId,
  windowLabel,
  trend,
  overviewCohorts = null,
  markets,
  countries,
  dataCountries = countries,
  trialCancelTiming = null,
  userJourney = null,
  paywallCohortComparisons = null,
  yearlyPriceComparison = null,
  paywallFlowComparison = null,
  countryComparisons,
  countryBreakdown,
  headerStart,
  headerEnd,
}: {
  appId: "glow" | "poky" | "versy";
  installs: number;
  windowLabel: string;
  trend: FunnelTrendPoint[];
  overviewCohorts?: AppOverviewCohorts | null;
  markets?: AnalyticsMarkets;
  countries: MobileAppCountryRow[];
  dataCountries?: MobileAppCountryRow[];
  cohortDataAvailable?: boolean;
  plans: MobileAppPlanCountryRow[];
  retention: MobileAppRetentionCountryRow[];
  trialCancelTiming?: TrialCancelTiming | null;
  userJourney?: UserJourneyReport | null;
  paywallCohortComparisons?: GlowPaywallCohortComparisons | null;
  yearlyPriceComparison?: PaywallCohortComparison | null;
  paywallFlowComparison?: PaywallCohortComparison | null;
  countryComparisons?: AppCountryComparisons;
  countryBreakdown?: { countries: MobileAppCountryRow[]; available: boolean; windowLabel: string };
  headerStart?: ReactNode;
  headerEnd?: ReactNode;
}) {
  const headerRef = useRef<HTMLDivElement>(null);
  const stickyAnchorRef = useRef<HTMLSpanElement>(null);
  const [isHeaderSticky, setIsHeaderSticky] = useState(false);
  useEffect(() => {
    const header = headerRef.current;
    const anchor = stickyAnchorRef.current;
    if (!header || !anchor) return;
    let observer: IntersectionObserver;
    const observe = () => {
      observer?.disconnect();
      const stickyTop = Number.parseFloat(getComputedStyle(header).top) || 0;
      // The anchor stays at the header's normal flow position while the header sticks.
      observer = new IntersectionObserver(([entry]) => {
        setIsHeaderSticky(entry.boundingClientRect.top < stickyTop);
      }, { rootMargin: `-${stickyTop}px 0px 0px 0px`, threshold: 1 });
      observer.observe(anchor);
    };
    observe();
    window.addEventListener("resize", observe);
    return () => { observer.disconnect(); window.removeEventListener("resize", observe); };
  }, [headerStart, headerEnd]);
  const language = DEFAULT_APP_LANGUAGE[appId];
  const [pickedCountry, setPickedCountry] = useState("all");
  const country = countryComparisons?.options.some((option) => option.code === pickedCountry) ? pickedCountry : "all";
  const countrySlice = country !== "all" ? countryComparisons?.slices[country] : null;
  const market = markets?.slices[marketKey(language, country)];
  const selectedOverview = markets ? market?.overview ?? (overviewCohorts ? { ...overviewForLanguage(overviewCohorts, "absent"), available: true } : null)
    : overviewCohorts ? overviewForLanguage(overviewCohorts, language) : null;
  const selectedCountries = countryBreakdown
    ? countryBreakdown.countries.filter((row) => country === "all" || row.country === country)
    : markets ? market?.dataCountries ?? [] : dataCountries;
  const comparisonLabel = experimentCohortLabel(appId);
  const selectedTrialTiming = country !== "all" ? countrySlice?.trialCancelTiming
    : comparisonLabel ? trialCancelTiming : markets ? market?.trialCancelTiming : trialCancelTiming;
  const selectedJourney = country === "all" ? userJourney : countrySlice?.userJourney ?? null;
  const selectedGlowPaywalls = country === "all" ? paywallCohortComparisons : countrySlice?.paywallCohortComparisons ?? null;
  const selectedYearlyPrices = country === "all" ? yearlyPriceComparison : countrySlice?.yearlyPriceComparison ?? null;
  const selectedPokyPaywalls = country === "all" ? paywallFlowComparison : countrySlice?.paywallFlowComparison ?? null;
  const installLabel = "Tracked installs";
  const cohortAvailable = Boolean(selectedOverview?.available);
  const total = selectedOverview?.total;
  const appu = total && cohortAvailable ? totalCohortAppu(total) : null;
  const installToPaid = cohortAvailable && total && total.installs > 0 && total.missingMoney === 0
    ? total.paid / total.installs : null;
  const countryPicker = countryComparisons?.options.length ? <div className="flex min-w-0 overflow-x-auto scrollbar-none">
        <div className={cn(DASHBOARD_TAB_LIST_CLASS, "mx-auto h-auto min-h-[30px] shrink-0")} role="group" aria-label="Country">
          {[{ code: "all", installs: 0 }, ...countryComparisons.options].map((option) => <button key={option.code}
            type="button" aria-pressed={country === option.code} onClick={() => setPickedCountry(option.code)}
            className={cn(DASHBOARD_TAB_CLASS, "whitespace-nowrap px-3", country === option.code ? DASHBOARD_TAB_ACTIVE_CLASS : DASHBOARD_TAB_INACTIVE_CLASS)}>
            <span aria-hidden="true" className="mr-1.5">{option.code === "all" ? "🌍" : countryFlag(option.code)}</span>
            {marketCountryLabel(option.code)}
          </button>)}
        </div>
      </div> : null;
  return (
    <section className="relative w-full min-w-0 space-y-4">
      {headerStart || headerEnd ? <span ref={stickyAnchorRef} aria-hidden="true" className="pointer-events-none absolute top-0 h-px w-px" /> : null}
      {headerStart || headerEnd ? <div ref={headerRef} className={APP_ANALYTICS_HEADER_CLASS} data-analytics-header data-stuck={isHeaderSticky}>
        <span aria-hidden="true" data-header-shadow className={cn("pointer-events-none absolute inset-0 rounded-[inherit] shadow-[0_4px_12px_rgba(0,0,0,0.05),0_12px_32px_rgba(0,0,0,0.08)] transition-opacity duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none", isHeaderSticky ? "opacity-100" : "opacity-0")} />
        <div className="min-w-0">{headerStart}</div>
        {countryPicker ?? <div />}
        <div className="sm:justify-self-end">{headerEnd}</div>
      </div> : countryPicker}
      <div className="w-full min-w-0 max-w-full overflow-x-auto rounded-[28px] border-0 bg-white shadow-none">
        <div className="min-w-0 border-b border-black/[0.08]">
          <div className="grid grid-cols-3 divide-x divide-black/[0.08]">
            <MetricSummary label={installLabel} value={formatInt(total?.installs ?? 0)} detail={`${overviewLanguageLabel(language)} · ${marketCountryLabel(country)} · ${windowLabel}`} />
            <MetricSummary label="APPU" value={appu == null ? "—" : formatPreciseCurrency(appu)} detail={!cohortAvailable || !total ? "Cohort data unavailable" : total.missingMoney > 0 ? "Proceeds data unavailable" : total.installs > 0 ? `${formatInt(total.installs)} tracked installs · through today` : "No tracked installs"} />
            <MetricSummary label="Conversion to paid" value={installToPaid == null ? "—" : formatRate(installToPaid)} detail={!cohortAvailable || !total ? "Cohort data unavailable" : total.missingMoney > 0 ? "Payment data unavailable" : `${formatInt(total.paid)} paid / ${formatInt(total.installs)} tracked installs · through today`} />
          </div>
        </div>
        <div className="min-w-0 p-4 sm:p-6">
          <AppNotesChart appId={appId} data={trend} cohorts={selectedOverview} installLabel={installLabel} />
        </div>
      </div>

      <div
        id="app-analytics-panel-data"
        className="space-y-4"
      >
        {markets ? <DashboardCard title="App versions" contentClassName="pt-0">
          <JourneyVersionComparison splitAdSources={appId === "glow" || appId === "versy"} showInstallPaid={appId === "poky"} cohorts={(market?.versions ?? []).filter((row) => row.version !== "unknown").slice(0, 5)} />
        </DashboardCard> : userJourney?.versions?.length ? <DashboardCard title="App versions" contentClassName="pt-0">
          <JourneyVersionComparison splitAdSources={appId === "glow" || appId === "versy"} showInstallPaid={appId === "poky"} cohorts={userJourney.versions.filter((row) => row.version !== "unknown").slice(0, 5)} />
        </DashboardCard> : null}
        <UserJourneyFunnel key={`${appId}:${country}`} appId={appId} report={selectedJourney} windowLabel={windowLabel} funnelOnly />
        {appId === "glow" ? <GlowPaywallCohortTables key={country} report={selectedGlowPaywalls} windowLabel={windowLabel} /> : null}
        {appId === "versy" ? <VersyYearlyPriceTable key={country} report={selectedYearlyPrices} /> : null}
        {appId === "poky" ? <PokyPaywallFlowTable key={country} report={selectedPokyPaywalls} windowLabel={windowLabel} /> : null}
        {selectedTrialTiming ? <TrialCancelChart timing={selectedTrialTiming} windowLabel={comparisonLabel ?? windowLabel} /> : null}
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <AppCountryBreakdown countries={selectedCountries} windowLabel={countryBreakdown?.windowLabel} available={countryBreakdown?.available} />
          <AppConversionBreakdown countries={selectedCountries} conversion="paid" windowLabel={countryBreakdown?.windowLabel} available={countryBreakdown?.available} />
        </div>
      </div>
    </section>
  );
}

function MetricSummary({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="min-w-0 px-4 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

function formatInt(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatPreciseCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRate(value: number) {
  return `${(value * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}
