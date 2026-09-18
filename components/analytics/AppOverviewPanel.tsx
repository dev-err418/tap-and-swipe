"use client";

import { VisitorsRevenueChart, type FunnelTrendPoint } from "@/components/analytics/AppSprintFunnelCharts";
import AppCountryBreakdown from "@/components/analytics/AppCountryBreakdown";
import AppTrialBreakdown from "@/components/analytics/AppTrialBreakdown";
import type { MobileAppCountryRow } from "@/lib/mobile-app-analytics";

export default function AppOverviewPanel({
  installs,
  proceeds,
  paid,
  windowLabel,
  trend,
  countries,
}: {
  installs: number;
  proceeds: number;
  paid: number;
  windowLabel: string;
  trend: FunnelTrendPoint[];
  countries: MobileAppCountryRow[];
}) {
  const appu = installs > 0 ? proceeds / installs : 0;
  const installToPaid = installs > 0 ? paid / installs : 0;

  return (
    <section className="space-y-4">
      <div className="min-w-0 overflow-visible rounded-[28px] border-0 bg-white shadow-none">
        <div className="min-w-0 overflow-x-auto border-b border-black/[0.08]">
          <div className="grid min-w-[48rem] grid-cols-4 divide-x divide-black/[0.08]">
            <MetricSummary label="Installs" value={formatInt(installs)} detail={windowLabel} />
            <MetricSummary label="Proceeds" value={formatCurrency(proceeds)} detail={windowLabel} />
            <MetricSummary label="APPU" value={formatPreciseCurrency(appu)} detail="Proceeds / installs" />
            <MetricSummary
              label="Install → paid"
              value={formatRate(installToPaid)}
              detail={`${formatInt(paid)} paid / ${formatInt(installs)} installs`}
            />
          </div>
        </div>
        <div className="min-w-0 p-4">
          <VisitorsRevenueChart
            data={trend}
            visitLabel="Installs"
            revenueLabel="Proceeds"
            emptyMessage="Install and proceeds trends appear after Superwall events are tracked."
          />
        </div>
      </div>
      {countries.some((row) => row.trials > 0) ? (
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          <AppCountryBreakdown countries={countries} />
          <AppTrialBreakdown countries={countries} />
        </div>
      ) : (
        <AppCountryBreakdown countries={countries} />
      )}
    </section>
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
