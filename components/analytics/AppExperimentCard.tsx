"use client";

import { useState } from "react";
import type {
  MobileAppExperiment,
  MobileAppExperimentScoreMetric,
  MobileAppExperimentVariant,
} from "@/lib/mobile-app-analytics";
import { AppExperimentLayout, ExperimentTable, ExperimentTh as Th, ExperimentTd as Td, ExperimentNumberTd as NumberTd, ExperimentVariantLabel } from "@/components/analytics/AppExperimentLayout";
import ExperimentStats, { ExperimentWarningBadge } from "@/components/analytics/ExperimentStats";
import {
  DASHBOARD_POPOVER_CLASS,
  DASHBOARD_POPOVER_ITEM_CLASS,
} from "@/components/analytics/dashboard-surface";
import { analyzeExperiment, type ExperimentAnalysis, type ExperimentArm } from "@/lib/experiment-stats";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

const ALL_COUNTRIES = "all";

export default function AppExperimentCard({
  experiment,
  topCountries = [],
}: {
  experiment: MobileAppExperiment;
  topCountries?: string[];
}) {
  const [country, setCountry] = useState(ALL_COUNTRIES);
  const variants = variantsForCountry(experiment.variants, country);
  const scoreMetrics = (experiment.scoreMetrics ?? ["appu", "download_paid"]).filter((metric) => metric !== "appu_d30");
  const sessionDays = experiment.sessionDays && experiment.sessionDays > 0 ? experiment.sessionDays : 1;
  const elapsedDays = experiment.elapsedDays && experiment.elapsedDays > 0 ? experiment.elapsedDays : sessionDays;
  const languages = (experiment.languageComparisons ?? []).map((comparison) => ({
    ...comparison, variants: variantsForCountry(comparison.variants, country),
  }));
  const scored = [
    ...languages.map((comparison) => ({
      key: `language-${comparison.language}`, title: comparison.label,
      analysis: analyzeExperiment(toAppuArms(comparison.variants), "revenue_per_visitor", comparison.label, { elapsedDays }),
    })),
    ...scoreMetrics.map((metric) => scoredAnalysis(metric, variants, sessionDays, elapsedDays)),
  ];
  const warningAnalysis = firstInsufficient(scored.map((item) => item.analysis)) ?? scored[0]?.analysis;
  const bestDownloadPaidKey = bestVariantKey(variants, (row) => ratio(row.paid, row.installs));
  const bestAppuKey = bestVariantKey(variants, (row) => ratio(row.proceeds, row.installs));
  const bestAppuD7Key = bestVariantKey(variants, (row) => ratio(row.proceedsD7, row.installsD7));
  const bestAppuD14Key = bestVariantKey(variants, (row) => ratio(row.proceedsD14, row.installsD14));
  const bestSessionsKey = bestVariantKey(variants, (row) => ratio(row.sessions, row.users * sessionDays));
  const showTrials = experiment.showTrials === true;
  const showRetention = experiment.showRetention === true;
  const showUsers = experiment.showUsers === true;
  const showSessions = experiment.showSessions === true;
  const showInstalls = experiment.showInstalls !== false;
  const showPaid = experiment.showPaid !== false;
  const showDownloadPaid = experiment.showDownloadPaid !== false;
  const showCohortAppu = scoreMetrics.some((metric) => metric === "appu_d7" || metric === "appu_d14");
  const scoreDownloadPaid = scoreMetrics.includes("download_paid");
  const scoreAppu = scoreMetrics.includes("appu");
  const scoreSessions = scoreMetrics.includes("sessions_per_day");

  return (
    <AppExperimentLayout
      title={experiment.title}
      titleAccessory={warningAnalysis ? <ExperimentWarningBadge analysis={warningAnalysis} /> : null}
      action={
        topCountries.length > 0 ? <CountryFilter value={country} countries={topCountries} onValueChange={setCountry} /> : null
      }
    >
      {scored.map((item) => (
        <ExperimentStats key={item.key} analysis={item.analysis} title={item.title} titleClassName="font-bold" showReadiness={experiment.randomized !== false || !!experiment.planningNote} historical={experiment.randomized === false} />
      ))}
      {experiment.planningNote && (experiment.id === "poky-app-experience" || experiment.id === "poky-native-recovery-holdout") ? (
        <p className="border-b border-black/[0.08] px-4 py-3 text-xs text-black/55">{experiment.planningNote}</p>
      ) : null}
      <ExperimentTable headings={<>
              <Th>Variant</Th>
              {languages.map((comparison) => <Th key={comparison.language} right>{comparison.label}</Th>)}
              {showUsers ? <Th right>{experiment.paidUsersOnly ? "Paid users" : "Users"}</Th> : null}
              {showInstalls ? <Th right>Installs</Th> : null}
              {showPaid ? <Th right>Paid</Th> : null}
              <Th right>Proceeds</Th>
              {showSessions ? (
                <Th right className={scoreSessions ? "font-bold text-black" : undefined}>
                  Avg sessions / day
                </Th>
              ) : null}
              {experiment.showCompletion ? <Th right>Onboarding completion</Th> : null}
              {showTrials ? <Th right>Download → trial</Th> : null}
              {showTrials ? <Th right>Trial → paid</Th> : null}
              {showCohortAppu ? (
                <Th right className="font-bold text-black">
                  APPU D7
                </Th>
              ) : null}
              {showCohortAppu ? (
                <Th right className="font-bold text-black">
                  APPU D14
                </Th>
              ) : null}
              {showRetention ? <Th right>D7 subscribed</Th> : null}
              {showRetention ? <Th right>D14 subscribed</Th> : null}
              {showRetention ? <Th right>D30 subscribed</Th> : null}
              {showDownloadPaid ? (
                <Th right className={scoreDownloadPaid ? "font-bold text-black" : undefined}>
                  Download → paid
                </Th>
              ) : null}
              {scoreAppu ? (
                <Th right className="font-bold text-black">
                  APPU
                </Th>
              ) : null}
      </>}>
            {variants.map((row, index) => (
              <tr key={row.key} className="border-b border-black/[0.07]">
                <Td>
                  <ExperimentVariantLabel index={index}>{row.label}</ExperimentVariantLabel>
                </Td>
                {languages.map((comparison) => {
                  const localized = comparison.variants.find((variant) => variant.key === row.key);
                  return <NumberTd key={comparison.language}>{localized && localized.installs > 0
                    ? formatPreciseCurrency(localized.proceeds / localized.installs) : "—"}</NumberTd>;
                })}
                {showUsers ? <NumberTd>{formatInt(row.users)}</NumberTd> : null}
                {showInstalls ? <NumberTd>{formatInt(row.installs)}</NumberTd> : null}
                {showPaid ? <NumberTd>{formatInt(row.paid)}</NumberTd> : null}
                <NumberTd>{formatPreciseCurrency(row.proceeds)}</NumberTd>
                {showSessions ? (
                  <NumberTd className={scoreSessions && row.key === bestSessionsKey ? "font-bold" : undefined}>
                    {formatAvg(ratio(row.sessions, row.users * sessionDays))}
                  </NumberTd>
                ) : null}
                {experiment.showCompletion ? (
                  <NumberTd>{formatPercent(ratio(row.completed, row.installs))}</NumberTd>
                ) : null}
                {showTrials ? <NumberTd>{formatPercent(ratio(row.trials, row.installs))}</NumberTd> : null}
                {showTrials ? <NumberTd>{formatPercent(ratio(row.converted, row.trials))}</NumberTd> : null}
                {showCohortAppu ? (
                  <NumberTd className={row.key === bestAppuD7Key ? "font-bold" : undefined}>
                    {formatPreciseCurrency(ratio(row.proceedsD7, row.installsD7))}
                  </NumberTd>
                ) : null}
                {showCohortAppu ? (
                  <NumberTd className={row.key === bestAppuD14Key ? "font-bold" : undefined}>
                    {formatPreciseCurrency(ratio(row.proceedsD14, row.installsD14))}
                  </NumberTd>
                ) : null}
                {showRetention ? <NumberTd>{formatPercent(ratio(row.retainedD7, row.eligibleD7))}</NumberTd> : null}
                {showRetention ? <NumberTd>{formatPercent(ratio(row.retainedD14, row.eligibleD14))}</NumberTd> : null}
                {showRetention ? <NumberTd>{formatPercent(ratio(row.retainedD30, row.eligibleD30))}</NumberTd> : null}
                {showDownloadPaid ? (
                  <NumberTd className={scoreDownloadPaid && row.key === bestDownloadPaidKey ? "font-bold" : undefined}>
                    {formatPercent(ratio(row.paid, row.installs))}
                  </NumberTd>
                ) : null}
                {scoreAppu ? (
                  <NumberTd className={row.key === bestAppuKey ? "font-bold" : undefined}>
                    {formatPreciseCurrency(ratio(row.proceeds, row.installs))}
                  </NumberTd>
                ) : null}
              </tr>
            ))}
      </ExperimentTable>
    </AppExperimentLayout>
  );
}

function CountryFilter({
  value,
  countries,
  onValueChange,
}: {
  value: string;
  countries: string[];
  onValueChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        size="sm"
        aria-label="Experiment country"
        className="h-7 min-h-7 w-auto gap-1 rounded-full border-0 bg-foreground/[0.045] px-2.5 text-xs font-medium shadow-none hover:bg-foreground/[0.07] focus-visible:ring-2 focus-visible:ring-ring/40 data-[size=sm]:h-7"
      >
        <span>
          {value === ALL_COUNTRIES ? "All countries" : `${countryFlag(value)} ${countryName(value)}`}
        </span>
      </SelectTrigger>
      <SelectContent side="bottom" align="end" position="popper" className={DASHBOARD_POPOVER_CLASS}>
        <SelectItem value={ALL_COUNTRIES} className={DASHBOARD_POPOVER_ITEM_CLASS}>
          All countries
        </SelectItem>
        {countries.map((code) => (
          <SelectItem key={code} value={code} className={DASHBOARD_POPOVER_ITEM_CLASS}>
            {countryFlag(code)} {countryName(code)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function bestVariantKey(
  variants: MobileAppExperimentVariant[],
  metric: (variant: MobileAppExperimentVariant) => number,
) {
  if (variants.length === 0) return null;
  const ranked = variants.map((variant) => ({ key: variant.key, value: metric(variant) }));
  const max = Math.max(...ranked.map((row) => row.value));
  const leaders = ranked.filter((row) => row.value === max);
  return leaders.length === 1 ? leaders[0].key : null;
}

function variantsForCountry(variants: MobileAppExperimentVariant[], country: string) {
  if (country === ALL_COUNTRIES) return variants;
  return variants.map((variant) => ({
    ...variant,
    ...(variant.countries[country] ?? {
      users: 0,
      sessions: 0,
      installs: 0,
      completed: 0,
      trials: 0,
      converted: 0,
      paid: 0,
      proceeds: 0,
      installsD7: 0,
      proceedsD7: 0,
      eligibleD7: 0,
      retainedD7: 0,
      installsD14: 0,
      proceedsD14: 0,
      eligibleD14: 0,
      retainedD14: 0,
      installsD30: 0,
      proceedsD30: 0,
      eligibleD30: 0,
      retainedD30: 0,
    }),
  }));
}

function scoredAnalysis(
  metric: MobileAppExperimentScoreMetric,
  variants: MobileAppExperimentVariant[],
  sessionDays = 1,
  elapsedDays = sessionDays,
) {
  if (metric === "sessions_per_day") {
    return {
      key: metric,
      title: "Avg sessions / day",
      analysis: analyzeExperiment(toSessionsArms(variants, sessionDays), "revenue_per_visitor", "Avg sessions / day", { elapsedDays }),
    };
  }
  if (metric === "appu") {
    return { key: metric, title: "APPU", analysis: analyzeExperiment(toAppuArms(variants), "revenue_per_visitor", "APPU", { elapsedDays }) };
  }
  if (metric === "download_paid") {
    return {
      key: metric,
      title: "Download → paid",
      analysis: analyzeExperiment(toDownloadPaidArms(variants), "conversion_rate", "Download → paid", { elapsedDays }),
    };
  }
  if (metric === "appu_d7") {
    return {
      key: metric,
      title: "APPU D7",
      analysis: analyzeExperiment(toCohortAppuArms(variants, 7), "revenue_per_visitor", "APPU D7", { elapsedDays: Math.max(1, elapsedDays - 7) }),
    };
  }
  if (metric === "appu_d14") {
    return {
      key: metric,
      title: "APPU D14",
      analysis: analyzeExperiment(toCohortAppuArms(variants, 14), "revenue_per_visitor", "APPU D14", { elapsedDays: Math.max(1, elapsedDays - 14) }),
    };
  }
  return {
    key: metric,
    title: "APPU D30",
    analysis: analyzeExperiment(toCohortAppuArms(variants, 30), "revenue_per_visitor", "APPU D30", { elapsedDays: Math.max(1, elapsedDays - 30) }),
  };
}

function toAppuArms(variants: MobileAppExperimentVariant[]): ExperimentArm[] {
  return variants.map((row) => ({
    key: row.key,
    label: row.label,
    exposures: row.installs,
    conversions: row.paid,
    revenue: row.proceeds,
  }));
}

function toDownloadPaidArms(variants: MobileAppExperimentVariant[]): ExperimentArm[] {
  return variants.map((row) => ({
    key: row.key,
    label: row.label,
    exposures: row.installs,
    conversions: row.paid,
    revenue: 0,
  }));
}

function toCohortAppuArms(variants: MobileAppExperimentVariant[], days: 7 | 14 | 30): ExperimentArm[] {
  return variants.map((row) => ({
    key: row.key,
    label: row.label,
    exposures: days === 7 ? row.installsD7 : days === 14 ? row.installsD14 : row.installsD30,
    conversions: row.paid,
    revenue: days === 7 ? row.proceedsD7 : days === 14 ? row.proceedsD14 : row.proceedsD30,
  }));
}

function toSessionsArms(variants: MobileAppExperimentVariant[], sessionDays: number): ExperimentArm[] {
  const days = sessionDays > 0 ? sessionDays : 1;
  return variants.map((row) => {
    const mean = row.users > 0 ? row.sessions / days / row.users : 0;
    return {
      key: row.key,
      label: row.label,
      exposures: row.users,
      conversions: Math.min(row.users, row.sessions),
      revenue: row.sessions / days,
      // Aggregate session rows do not retain squared values; use a Poisson planning approximation.
      variance: mean,
    };
  });
}

function firstInsufficient(analyses: ExperimentAnalysis[]) {
  return analyses.find((analysis) => !analysis.sufficientData) ?? null;
}

function ratio(part: number, total: number) {
  return total > 0 ? part / total : 0;
}
function formatInt(value: number) {
  return finite(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function formatAvg(value: number) {
  return finite(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatPercent(value: number) {
  return `${(finite(value) * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}
function formatPreciseCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(finite(value));
}
function finite(value: number) {
  return Number.isFinite(value) ? value : 0;
}
function countryFlag(code: string) {
  return code.toUpperCase().replace(/./g, (character) => String.fromCodePoint(127397 + character.charCodeAt(0)));
}
function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}
