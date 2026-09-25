"use client";

import { useState } from "react";
import type { FunnelTrendPoint } from "@/components/analytics/AppSprintFunnelCharts";
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
import JournalPracticePanel from "@/components/analytics/JournalPracticePanel";
import UserJourneyFunnel from "@/components/analytics/UserJourneyFunnel";
import type { UserJourneyReport } from "@/lib/user-journey";
import type { JournalPracticeReport } from "@/lib/journal-practice-analytics";
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

export default function AppOverviewPanel({
  appId,
  installs,
  proceeds,
  windowLabel,
  trend,
  countries,
  dataCountries = countries,
  cohortDataAvailable = true,
  experimentCountries = countries,
  plans,
  retention,
  experiments = [],
  trialCancelTiming = null,
  nativePaywalls = null,
  journalPractice = null,
  userJourney = null,
}: {
  appId: "glow" | "poky" | "versy";
  installs: number;
  proceeds: number;
  windowLabel: string;
  trend: FunnelTrendPoint[];
  countries: MobileAppCountryRow[];
  dataCountries?: MobileAppCountryRow[];
  cohortDataAvailable?: boolean;
  experimentCountries?: MobileAppCountryRow[];
  plans: MobileAppPlanCountryRow[];
  retention: MobileAppRetentionCountryRow[];
  experiments?: MobileAppExperiment[];
  trialCancelTiming?: TrialCancelTiming | null;
  nativePaywalls?: NativePaywallReport | null;
  journalPractice?: JournalPracticeReport | null;
  userJourney?: UserJourneyReport | null;
}) {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("data");
  const cohort = dataCountries.reduce((total, row) => ({
    installs: total.installs + row.installs,
    proceeds: total.proceeds + row.proceeds,
    paid: total.paid + row.paid,
  }), { installs: 0, proceeds: 0, paid: 0 });
  const appu = cohort.installs > 0 ? cohort.proceeds / cohort.installs : null;
  const installToPaid = cohort.installs > 0 ? cohort.paid / cohort.installs : null;
  const showPlans = plans.some((row) => row.yearlySubs + row.weeklySubs > 0);
  const showRetention = retention.some((row) => row.overall.d1.eligible > 0);
  const topCountries = experimentCountries
    .map((row) => row.country)
    .filter((country) => country !== "unknown")
    .slice(0, 5);

  return (
    <section className="space-y-4">
      <div className="min-w-0 overflow-visible rounded-[28px] border-0 bg-white shadow-none">
        <div className="min-w-0 overflow-x-auto border-b border-black/[0.08]">
          <div className="grid min-w-[48rem] grid-cols-4 divide-x divide-black/[0.08]">
            <MetricSummary label="Installs" value={formatInt(installs)} detail={windowLabel} />
            <MetricSummary label="Proceeds" value={formatCurrency(proceeds)} detail={windowLabel} />
            <MetricSummary label="Cohort APPU" value={!cohortDataAvailable || appu == null ? "—" : formatPreciseCurrency(appu)} detail={cohortDataAvailable ? `${formatInt(cohort.installs)} ${appId === "glow" ? "mature installs" : "tracked installs"} · through today` : "Cohort data unavailable"} />
            <MetricSummary
              label="Install → paid"
              value={!cohortDataAvailable || installToPaid == null ? "—" : formatRate(installToPaid)}
              detail={cohortDataAvailable ? `${formatInt(cohort.paid)} paid / ${formatInt(cohort.installs)} cohort installs` : "Cohort data unavailable"}
            />
          </div>
        </div>
        <div className="min-w-0 p-4">
          <AppNotesChart appId={appId} data={trend} />
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
          <AppExperimentMap appId={appId} experiments={experiments} nativePaywalls={nativePaywalls} journalPractice={journalPractice} />
          {appId === "glow" && <JournalPracticePanel report={journalPractice} />}
          {experiments.length > 0 ? experiments.map((experiment) => (
            <AppExperimentCard
              key={experiment.id}
              experiment={experiment}
              topCountries={topCountries}
            />
          )) : <TabEmptyState>No AB test data yet.</TabEmptyState>}
        </div>
      ) : null}

      {activeTab === "paywalls" ? (
        <div
          id="app-analytics-panel-paywalls"
          role="tabpanel"
          aria-labelledby="app-analytics-tab-paywalls"
          className="min-w-0"
        >
          {appId === "glow" || appId === "poky"
            ? <NativePaywallsPanel appId={appId} report={nativePaywalls} />
            : <TabEmptyState>No paywall data yet.</TabEmptyState>}
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
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function formatInt(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
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
