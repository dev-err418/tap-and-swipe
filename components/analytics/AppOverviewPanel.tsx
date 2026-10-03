"use client";

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
import AppPlanBreakdown from "@/components/analytics/AppPlanBreakdown";
import AppRetentionBreakdown from "@/components/analytics/AppRetentionBreakdown";
import AppNotesChart from "@/components/analytics/AppNotesChart";
import NativePaywallsPanel from "@/components/analytics/NativePaywallsPanel";
import WinbackPaywallPanel from "@/components/analytics/WinbackPaywallPanel";
import VersyPaywallPlacementsPanel from "@/components/analytics/VersyPaywallPlacementsPanel";
import GlowOnboardingExperiencePanel from "./GlowOnboardingExperiencePanel";
import type { GlowOnboardingReport } from "@/lib/glow-onboarding-experience";
import UserJourneyFunnel from "@/components/analytics/UserJourneyFunnel";
import type { UserJourneyReport } from "@/lib/user-journey";
import type { NativePaywallReport } from "@/lib/native-paywall-analytics";
import {
  DASHBOARD_SURFACE_CLASS,
  DASHBOARD_TAB_ACTIVE_CLASS,
  DASHBOARD_TAB_CLASS,
  DASHBOARD_TAB_INACTIVE_CLASS,
  DASHBOARD_TAB_LIST_CLASS,
  DASHBOARD_PICKER_TRIGGER_CLASS,
  DASHBOARD_POPOVER_CLASS,
  DASHBOARD_POPOVER_ITEM_CLASS,
} from "@/components/analytics/dashboard-surface";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AnalyticsTab = "data" | "experiments" | "paywalls";

const ANALYTICS_TABS: { id: AnalyticsTab; label: string }[] = [
  { id: "data", label: "Data" },
  { id: "experiments", label: "AB tests" },
  { id: "paywalls", label: "Paywalls" },
];

const LANGUAGE_FLAGS: Record<string, string> = {
  en: "🇬🇧", es: "🇪🇸", de: "🇩🇪", fr: "🇫🇷",
  it: "🇮🇹", pt: "🇵🇹", ja: "🇯🇵", ko: "🇰🇷", zh: "🇨🇳",
};

type MonthExperimentBundle = {
  experiments: MobileAppExperiment[];
  countries: MobileAppCountryRow[];
  nativePaywalls: NativePaywallReport | null;
  onboardingExperience: GlowOnboardingReport | null;
};

export default function AppOverviewPanel({
  appId,
  installs,
  windowLabel,
  trend,
  overviewCohorts = null,
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
  const [languageChoice, setLanguageChoice] = useState({ appId, language: "es" });
  const languages = [...new Set(["es", ...Object.keys(overviewCohorts?.languages ?? {})])].sort((a, b) =>
    a === "unknown" ? 1 : b === "unknown" ? -1 : overviewLanguageLabel(a).localeCompare(overviewLanguageLabel(b)));
  const language = languageChoice.appId === appId
    && (languageChoice.language === "all" || languages.includes(languageChoice.language))
    ? languageChoice.language : "es";
  const selectedOverview = overviewCohorts ? overviewForLanguage(overviewCohorts, language) : null;
  const installLabel = language === "all" ? "Installs" : "Tracked installs";
  const [monthBundle, setMonthBundle] = useState<{ appId: string; bundle: MonthExperimentBundle } | null>(null);
  const [monthFailedAppId, setMonthFailedAppId] = useState<string | null>(null);
  useEffect(() => {
    if (!deferExperiments || activeTab === "data" || (activeTab === "paywalls" && appId === "versy")
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
  const showPlans = plans.some((row) => row.yearlySubs + row.weeklySubs > 0);
  const showRetention = retention.some((row) => row.overall.d1.eligible > 0);
  const topCountries = resolvedExperimentCountries
    .map((row) => row.country)
    .filter((country) => country !== "unknown")
    .slice(0, 5);

  return (
    <section className="w-full min-w-0 space-y-4">
      <div className="w-full min-w-0 max-w-full overflow-x-auto rounded-[28px] border-0 bg-white shadow-none">
        <div className="min-w-0 border-b border-black/[0.08]">
          <div className="grid grid-cols-3 divide-x divide-black/[0.08]">
            <MetricSummary label={installLabel} value={formatInt(language === "all" ? installs : total?.installs ?? 0)} detail={language === "all" ? windowLabel : `${overviewLanguageLabel(language)} · ${windowLabel}`} />
            <MetricSummary label="APPU" value={appu == null ? "—" : formatPreciseCurrency(appu)} detail={!cohortAvailable || !total ? "Cohort data unavailable" : total.missingMoney > 0 ? "Proceeds data unavailable" : total.installs > 0 ? `${formatInt(total.installs)} tracked installs · through today` : "No tracked installs"} />
            <MetricSummary label="Conversion to paid" value={installToPaid == null ? "—" : formatRate(installToPaid)} detail={!cohortAvailable || !total ? "Cohort data unavailable" : total.missingMoney > 0 ? "Payment data unavailable" : `${formatInt(total.paid)} paid / ${formatInt(total.installs)} tracked installs · through today`} />
          </div>
        </div>
        <div className="min-w-0 p-4 sm:p-6">
          <AppNotesChart appId={appId} data={trend} cohorts={selectedOverview} installLabel={installLabel}
            languagePicker={
              <Select value={language} onValueChange={(value) => setLanguageChoice({ appId, language: value })}>
                <SelectTrigger aria-label="Graph language" className={`${DASHBOARD_PICKER_TRIGGER_CLASS} h-8 w-[180px] border border-black/10 text-xs`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" align="start" className={DASHBOARD_POPOVER_CLASS}>
                  {["all", ...languages].map((code) => (
                    <SelectItem key={code} value={code} className={DASHBOARD_POPOVER_ITEM_CLASS}>
                      <span className="inline-flex items-center gap-1.5"><span aria-hidden="true">{LANGUAGE_FLAGS[code] ?? "🌐"}</span>{overviewLanguageLabel(code)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            } />
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
          <UserJourneyFunnel report={userJourney} windowLabel={windowLabel} />
          {trialCancelTiming ? <TrialCancelChart timing={trialCancelTiming} windowLabel={windowLabel} /> : null}
          {productSlot}
          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <AppCountryBreakdown countries={dataCountries} />
            <AppConversionBreakdown countries={dataCountries} conversion="paid" />
          </div>
          {showPlans || showRetention ? (
            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
              {showPlans ? <AppPlanBreakdown plans={plans} /> : null}
              {showRetention ? (
                <AppRetentionBreakdown
                  rows={retention}
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
          {experimentsLoading ? <TabEmptyState>Loading the last 30 days of A/B tests…</TabEmptyState> : monthFailed ? <TabEmptyState>A/B tests could not be loaded.</TabEmptyState> : <>
            <AppExperimentMap appId={appId} experiments={resolvedExperiments} nativePaywalls={resolvedPaywalls ?? null} onboardingExperience={resolvedOnboarding ?? null} />
            {appId === "glow" && <GlowOnboardingExperiencePanel report={resolvedOnboarding ?? null} />}
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
          {appId === "glow" && <WinbackPaywallPanel appId={appId} />}
          {appId === "versy" ? <VersyPaywallPlacementsPanel />
            : experimentsLoading ? <TabEmptyState>Loading paywalls…</TabEmptyState> : monthFailed ? <TabEmptyState>Paywalls could not be loaded.</TabEmptyState>
            : <NativePaywallsPanel appId={appId} report={resolvedPaywalls ?? null} />}
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
