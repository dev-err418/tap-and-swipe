"use client";

import { useState, type ReactNode } from "react";
import type { MobileAppExperiment, MobileAppExperimentVariant } from "@/lib/mobile-app-analytics";
import { DashboardCard } from "@/components/analytics/DashboardCard";
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
import { cn } from "@/lib/utils";

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
  const appuAnalysis = analyzeExperiment(toAppuArms(variants), "revenue_per_visitor", "APPU");
  const downloadPaidAnalysis = analyzeExperiment(
    toDownloadPaidArms(variants),
    "conversion_rate",
    "Download → paid",
  );
  const warningAnalysis = firstInsufficient([appuAnalysis, downloadPaidAnalysis]) ?? appuAnalysis;
  const bestDownloadPaidKey = bestVariantKey(variants, (row) => ratio(row.paid, row.installs));
  const bestAppuKey = bestVariantKey(variants, (row) => ratio(row.proceeds, row.installs));

  return (
    <DashboardCard
      title={experiment.title}
      titleAccessory={<ExperimentWarningBadge analysis={warningAnalysis} />}
      titleClassName="flex items-center gap-1.5"
      action={
        <div className="flex items-center gap-2">
          {topCountries.length > 0 ? (
            <CountryFilter value={country} countries={topCountries} onValueChange={setCountry} />
          ) : null}
          <span className="text-xs text-muted-foreground">{experiment.subtitle}</span>
        </div>
      }
      contentClassName="min-w-0 p-0"
    >
      <ExperimentStats analysis={appuAnalysis} title="APPU" titleClassName="font-bold" />
      <ExperimentStats analysis={downloadPaidAnalysis} title="Download → paid" titleClassName="font-bold" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs text-black/50">
              <Th>Variant</Th>
              <Th right>Installs</Th>
              <Th right>Paid</Th>
              <Th right>Proceeds</Th>
              {experiment.showCompletion ? <Th right>Onboarding completion</Th> : null}
              <Th right>Download → trial</Th>
              <Th right>Trial → paid</Th>
              <Th right className="font-bold text-black">
                Download → paid
              </Th>
              <Th right className="font-bold text-black">
                APPU
              </Th>
            </tr>
          </thead>
          <tbody>
            {variants.map((row, index) => (
              <tr key={row.key} className="border-b border-black/[0.07]">
                <Td>
                  <div className="flex items-center gap-2">
                    <Badge>Variant {variantLetter(index)}</Badge>
                    <span className="font-medium">{row.label}</span>
                  </div>
                </Td>
                <NumberTd>{formatInt(row.installs)}</NumberTd>
                <NumberTd>{formatInt(row.paid)}</NumberTd>
                <NumberTd>{formatPreciseCurrency(row.proceeds)}</NumberTd>
                {experiment.showCompletion ? (
                  <NumberTd>{formatPercent(ratio(row.completed, row.installs))}</NumberTd>
                ) : null}
                <NumberTd>{formatPercent(ratio(row.trials, row.installs))}</NumberTd>
                <NumberTd>{formatPercent(ratio(row.converted, row.trials))}</NumberTd>
                <NumberTd className={row.key === bestDownloadPaidKey ? "font-bold" : undefined}>
                  {formatPercent(ratio(row.paid, row.installs))}
                </NumberTd>
                <NumberTd className={row.key === bestAppuKey ? "font-bold" : undefined}>
                  {formatPreciseCurrency(ratio(row.proceeds, row.installs))}
                </NumberTd>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>
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
      installs: 0,
      completed: 0,
      trials: 0,
      converted: 0,
      paid: 0,
      proceeds: 0,
    }),
  }));
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

function firstInsufficient(analyses: ExperimentAnalysis[]) {
  return analyses.find((analysis) => !analysis.sufficientData) ?? null;
}

function Th({ children, right = false, className }: { children: ReactNode; right?: boolean; className?: string }) {
  return <th className={cn("px-4 py-3 font-medium", right && "text-right", className)}>{children}</th>;
}
function Td({ children }: { children: ReactNode }) {
  return <td className="px-4 py-3">{children}</td>;
}
function NumberTd({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 text-right font-mono tabular-nums", className)}>{children}</td>;
}
function Badge({ children }: { children: ReactNode }) {
  return <span className="inline-flex rounded-md bg-black/[0.055] px-2 py-0.5 text-xs font-medium">{children}</span>;
}
function variantLetter(index: number) {
  return String.fromCharCode(65 + Math.max(0, index));
}
function ratio(part: number, total: number) {
  return total > 0 ? part / total : 0;
}
function formatInt(value: number) {
  return finite(value).toLocaleString("en-US", { maximumFractionDigits: 0 });
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
