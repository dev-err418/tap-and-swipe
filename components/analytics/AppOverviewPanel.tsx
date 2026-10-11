"use client";

import { DEFAULT_APP_LANGUAGE, marketKey, marketCountryLabel, type AnalyticsMarkets } from "@/lib/analytics-markets";
import AnalyticsFreshness from "./AnalyticsFreshness";

import { useEffect, useState, type ReactNode } from "react";
import type { FunnelTrendPoint } from "@/components/analytics/AppSprintFunnelCharts";
import { totalCohortAppu, overviewForLanguage, overviewLanguageLabel, type AppOverviewCohorts } from "@/lib/app-overview-cohorts";
import AppCountryBreakdown from "@/components/analytics/AppCountryBreakdown";
import AppConversionBreakdown from "@/components/analytics/AppConversionBreakdown";
import type {
  MobileAppCountryRow,
  MobileAppExperiment,
  MobileAppPlanCountryRow,
  MobileAppRetentionCountryRow,
  TrialCancelTiming,
} from "@/lib/mobile-app-analytics";
import AppExperimentCard from "@/components/analytics/AppExperimentCard";
import AppExperimentMap from "@/components/analytics/AppExperimentMap";
import TrialCancelChart from "@/components/analytics/TrialCancelChart";
import ActiveTrialsChart from "@/components/analytics/ActiveTrialsChart";
import AppPlanBreakdown from "@/components/analytics/AppPlanBreakdown";
import AppRetentionBreakdown from "@/components/analytics/AppRetentionBreakdown";
import AppNotesChart from "@/components/analytics/AppNotesChart";
import NativePaywallsPanel from "@/components/analytics/NativePaywallsPanel";
import WinbackPaywallPanel from "@/components/analytics/WinbackPaywallPanel";
import VersyPaywallPlacementsPanel from "@/components/analytics/VersyPaywallPlacementsPanel";
import GlowPaywallFlowPanel from "./GlowPaywallFlowPanel";
import GlowOnboardingExperiencePanel from "./GlowOnboardingExperiencePanel";
import type { GlowOnboardingReport } from "@/lib/glow-onboarding-experience";
import UserJourneyFunnel, { JourneyVersionComparison } from "@/components/analytics/UserJourneyFunnel";
import type { UserJourneyReport } from "@/lib/user-journey";
import type { NativePaywallReport } from "@/lib/native-paywall-analytics";
import {
  DASHBOARD_SURFACE_CLASS,
  DASHBOARD_TAB_ACTIVE_CLASS,
  DASHBOARD_TAB_CLASS,
  DASHBOARD_TAB_INACTIVE_CLASS,
  DASHBOARD_TAB_LIST_CLASS,
} from "@/components/analytics/dashboard-surface";
import { cn } from "@/lib/utils";

type AnalyticsTab = "data" | "experiments" | "paywalls";

const ANALYTICS_TABS: { id: AnalyticsTab; label: string }[] = [
  { id: "data", label: "Data" },
  { id: "experiments", label: "AB tests" },
  { id: "paywalls", label: "Paywalls" },
];

type MonthExperimentBundle = {
  snapshotUpdatedAt?: string;
  experiments: MobileAppExperiment[];
  countries: MobileAppCountryRow[];
  nativePaywalls: NativePaywallReport | null;
  onboardingExperience: GlowOnboardingReport | null;
};

export default function AppOverviewPanel({
  appId,
  windowLabel,
  trend,
  overviewCohorts = null,
  markets,
  countries,
  dataCountries = countries,
  experimentCountries = countries,
  plans,
  retention,
  experiments = [],
  trialCancelTiming = null,
  nativePaywalls = null,
  onboardingExperience = null,
  userJourney = null,
  deferExperiments = false,
  productSlot = null,
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
  experimentCountries?: MobileAppCountryRow[];
  plans: MobileAppPlanCountryRow[];
  retention: MobileAppRetentionCountryRow[];
  experiments?: MobileAppExperiment[];
  trialCancelTiming?: TrialCancelTiming | null;
  nativePaywalls?: NativePaywallReport | null;
  onboardingExperience?: GlowOnboardingReport | null;
  userJourney?: UserJourneyReport | null;
  deferExperiments?: boolean;
  productSlot?: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("data");
  const language = DEFAULT_APP_LANGUAGE[appId];
  const country = "all";
  const market = markets?.slices[marketKey(language, country)];
  const selectedOverview = markets ? market?.overview ?? (overviewCohorts ? { ...overviewForLanguage(overviewCohorts, "absent"), available: true } : null)
    : overviewCohorts ? overviewForLanguage(overviewCohorts, language) : null;
  const selectedCountries = markets ? market?.dataCountries ?? [] : dataCountries;
  const selectedPlans = markets ? market?.plans ?? [] : plans;
  const selectedRetention = markets ? market?.retention ?? [] : retention;
  const selectedTrialTiming = markets ? market?.trialCancelTiming : trialCancelTiming;
  const installLabel = "Tracked installs";
  const [monthBundle, setMonthBundle] = useState<{ appId: string; bundle: MonthExperimentBundle } | null>(null);
  const [monthFailedAppId, setMonthFailedAppId] = useState<string | null>(null);
  useEffect(() => {
    if (!deferExperiments || activeTab === "data"
      || monthBundle?.appId === appId || monthFailedAppId === appId) return;
    const controller = new AbortController();
    fetch(`/api/analytics/mobile-app?appId=${appId}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("App experiments failed to load");
        return response.json() as Promise<MonthExperimentBundle>;
      })
      .then((bundle) => setMonthBundle({ appId, bundle }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMonthFailedAppId(appId);
      });
    return () => controller.abort();
  }, [activeTab, appId, deferExperiments, monthBundle, monthFailedAppId]);
  const loadedBundle = monthBundle?.appId === appId ? monthBundle.bundle : null;
  const monthFailed = monthFailedAppId === appId;
  const resolvedExperiments = deferExperiments ? loadedBundle?.experiments ?? experiments : experiments;
  const resolvedPaywalls = deferExperiments ? loadedBundle?.nativePaywalls ?? nativePaywalls : nativePaywalls;
  const resolvedOnboarding = deferExperiments ? loadedBundle?.onboardingExperience ?? onboardingExperience : onboardingExperience;
  const resolvedExperimentCountries = deferExperiments ? loadedBundle?.countries ?? experimentCountries : experimentCountries;
  const experimentsLoading = deferExperiments && !loadedBundle && !monthFailed;
  const cohortAvailable = Boolean(selectedOverview?.available);
  const total = selectedOverview?.total;
  const appu = total && cohortAvailable ? totalCohortAppu(total) : null;
  const installToPaid = cohortAvailable && total && total.installs > 0 && total.missingMoney === 0
    ? total.paid / total.installs : null;
  const showPlans = selectedPlans.some((row) => row.yearlySubs + row.weeklySubs > 0);
  const showRetention = selectedRetention.some((row) => row.overall.d1.eligible > 0);
  const topCountries = resolvedExperimentCountries
    .map((row) => row.country)
    .filter((country) => country !== "unknown")
    .slice(0, 5);

  return (
    <section className="w-full min-w-0 space-y-4">
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

      <div className="flex justify-center px-4">
        <div className={DASHBOARD_TAB_LIST_CLASS} role="tablist" aria-label="App analytics">
          {ANALYTICS_TABS.map((tab) => (
            <button
              key={tab.id}
              id={`app-analytics-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`app-analytics-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                DASHBOARD_TAB_CLASS,
                "px-4",
                activeTab === tab.id ? DASHBOARD_TAB_ACTIVE_CLASS : DASHBOARD_TAB_INACTIVE_CLASS,
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "data" ? (
        <div
          id="app-analytics-panel-data"
          role="tabpanel"
          aria-labelledby="app-analytics-tab-data"
          className="space-y-4"
        >
          {appId === "versy" ? (
            <button type="button" onClick={() => setActiveTab("experiments")}
              className="flex w-full flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-5 py-4 text-left text-sm">
              <span><strong>Annual pricing test</strong><span className="ml-2 text-muted-foreground">$29.99 · $39.99 · $49.99</span></span>
              <span className="font-medium">View A/B tests →</span>
            </button>
          ) : null}
          {markets ? <div className="min-w-0 overflow-hidden rounded-[28px] bg-white p-4">
            <JourneyVersionComparison showInstallPaid={appId === "poky"} cohorts={(market?.versions ?? []).filter((row) => row.version !== "unknown").slice(0, 5)} />
          </div> : <UserJourneyFunnel appId={appId} report={userJourney} windowLabel={windowLabel} />}
          {selectedTrialTiming ? <ActiveTrialsChart report={selectedTrialTiming.activeTrials} windowLabel={windowLabel} /> : null}
          {selectedTrialTiming ? <TrialCancelChart timing={selectedTrialTiming} windowLabel={windowLabel} /> : null}
          {productSlot ? <details><summary className="cursor-pointer px-4 text-sm text-muted-foreground">Product activity · all languages and countries</summary>{productSlot}</details> : null}
          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <AppCountryBreakdown countries={selectedCountries} />
            <AppConversionBreakdown countries={selectedCountries} conversion="paid" />
          </div>
          {showPlans || showRetention ? (
            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
              {showPlans ? <AppPlanBreakdown plans={selectedPlans} /> : null}
              {showRetention ? (
                <AppRetentionBreakdown
                  rows={selectedRetention}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "experiments" ? (
        <div
          id="app-analytics-panel-experiments"
          role="tabpanel"
          aria-labelledby="app-analytics-tab-experiments"
          className="space-y-4"
        >
          <p className="px-4 text-xs text-muted-foreground">A/B tests use their own language and country breakdowns below.</p>
          <AnalyticsFreshness updatedAt={loadedBundle?.snapshotUpdatedAt} label="A/B tests" />
          {experimentsLoading ? <TabEmptyState>Loading the last 30 days of A/B tests…</TabEmptyState> : monthFailed ? <TabEmptyState>A/B tests could not be loaded.</TabEmptyState> : <>
            <AppExperimentMap appId={appId} experiments={resolvedExperiments} nativePaywalls={resolvedPaywalls ?? null} onboardingExperience={resolvedOnboarding ?? null} />
            {appId === "glow" && <><GlowOnboardingExperiencePanel report={resolvedOnboarding ?? null} /><GlowPaywallFlowPanel report={resolvedOnboarding?.paywallFlow ?? null} /></>}
            {resolvedExperiments.length > 0 ? resolvedExperiments.map((experiment) => (
              <AppExperimentCard
                key={experiment.id}
                experiment={experiment}
                topCountries={topCountries}
              />
            )) : <TabEmptyState>No AB test data yet.</TabEmptyState>}
          </>}
        </div>
      ) : null}

      {activeTab === "paywalls" ? (
        <div
          id="app-analytics-panel-paywalls"
          role="tabpanel"
          aria-labelledby="app-analytics-tab-paywalls"
          className="min-w-0 space-y-4"
        >
          <p className="px-4 text-xs text-muted-foreground">Paywalls use their own language filters · all countries.</p>
          {appId === "glow" && <WinbackPaywallPanel appId={appId} />}
          {appId === "versy" && <p className="px-1 text-sm text-muted-foreground">Compare onboarding routes by paid conversions and net proceeds in A/B tests. Below, verified purchases link revenue, renewals and refunds to the original route and purchase placement. Revenue per user makes different traffic shares comparable.</p>}
          <AnalyticsFreshness updatedAt={loadedBundle?.snapshotUpdatedAt} label="Paywalls" />
          {experimentsLoading ? <TabEmptyState>Loading paywalls…</TabEmptyState> : monthFailed ? <TabEmptyState>Paywalls could not be loaded.</TabEmptyState>
            : <NativePaywallsPanel appId={appId} report={resolvedPaywalls ?? null} />}
          {appId === "versy" && <details className="space-y-4"><summary className="cursor-pointer text-sm font-medium">App event history · includes older builds</summary><VersyPaywallPlacementsPanel /></details>}
        </div>
      ) : null}
    </section>
  );
}

function TabEmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(DASHBOARD_SURFACE_CLASS, "flex min-h-72 items-center justify-center p-6 text-sm text-muted-foreground")}>
      {children}
    </div>
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
