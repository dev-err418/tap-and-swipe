import { ArrowDownRight } from "lucide-react";
import type { AppSprintFunnelAnalytics, AppSprintFunnelBreakdownRow } from "@/lib/appsprint-funnel";
import { VisitorsRevenueChart } from "@/components/analytics/AppSprintFunnelCharts";
import { DashboardCard } from "@/components/analytics/DashboardCard";

const PREVIEW_ROWS = 10;
const POSTBACK_TINT_ORANGE = "#f97316";
const VISITOR_BLUE = "oklch(0.62 0.14 250)";
const VISITOR_BAR_SHARE = 62;
const REVENUE_BAR_SHARE = 100 - VISITOR_BAR_SHARE;

export default function AppSprintFunnelPanel({
  analytics,
  showHeroExperiment = true,
  showTrialExperiment = false,
}: {
  analytics: AppSprintFunnelAnalytics;
  showHeroExperiment?: boolean;
  showTrialExperiment?: boolean;
}) {
  const daily = analytics.daily.filter((row) => row.surface === "aso");
  const interval = analytics.interval?.filter((row) => row.surface === "aso") ?? [];
  const sources = sortRows(analytics.byChannel.filter((row) => row.surface === "aso"));
  const countries = sortRows(analytics.byCountry.filter((row) => row.surface === "aso"));
  const referrers = sortRows(analytics.byReferrer.filter((row) => row.surface === "aso"));
  const recent = analytics.recentConversions.filter((row) => row.surface === "aso").slice(0, 10);
  const visits = analytics.totals.asoVisits;
  const revenue = daily.reduce((sum, row) => sum + row.revenue, 0);
  const windowLabel = `Last ${analytics.windowDays} ${analytics.windowDays === 1 ? "day" : "days"}`;

  const trend = interval.length > 0
    ? interval.map((row) => ({
        date: row.bucket,
        visits: row.visits,
        revenue: row.revenue,
        trialStarts: row.asoTrials,
      }))
    : daily.map((row) => ({
        date: row.date,
        visits: row.visits,
        revenue: row.revenue,
        trialStarts: row.asoTrials,
      }));
  return (
    <section className="space-y-4">
      <DashboardCard title="Visitors and revenue" action={<span className="text-xs text-muted-foreground">{windowLabel}</span>} contentClassName="min-w-0 px-3 py-4">
        <VisitorsRevenueChart data={trend} />
      </DashboardCard>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric title="Visitors" value={formatInt(visits)} detail={windowLabel} />
        <Metric title="Revenue" value={formatCurrency(revenue)} detail={`${formatInt(analytics.totals.asoPaid)} paid (${formatPercent(ratio(analytics.totals.asoPaid, visits))})`} />
        <Metric title="Paid rate" value={formatPercent(ratio(analytics.totals.asoPaid, visits))} detail={`${formatInt(analytics.totals.asoPaid)} paid / ${formatInt(visits)} visitors`} />
        <Metric title="Revenue / visitor" value={formatPreciseCurrency(ratio(revenue, visits))} detail="Paid revenue / visitors" />
      </div>

      {showHeroExperiment ? <DashboardCard title="Hero preview A/B test" action={<span className="text-xs text-muted-foreground">{windowLabel}</span>} contentClassName="min-w-0 p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead><tr className="border-b border-black/10 text-left text-xs text-black/50"><Th>Variant</Th><Th right>Visitors</Th><Th right>Payment page</Th><Th right>Page rate</Th><Th right>Paid</Th><Th right>Paid rate</Th><Th right>Revenue</Th></tr></thead>
            <tbody>
              {analytics.heroPreviewExperiment.map((row, index) => (
                <tr key={row.variant} className="border-b border-black/[0.07]">
                  <Td><div className="flex items-center gap-2"><Badge>Variant {variantLetter(index)}</Badge><span className="font-medium">{row.label}</span></div></Td>
                  <NumberTd>{formatInt(row.visitors)}</NumberTd><NumberTd>{formatInt(row.paymentPageViews)}</NumberTd><NumberTd>{formatPercent(ratio(row.paymentPageViews, row.visitors))}</NumberTd><NumberTd>{formatInt(row.paid)}</NumberTd><NumberTd>{formatPercent(ratio(row.paid, row.visitors))}</NumberTd><NumberTd>{formatCurrency(row.revenue)}</NumberTd>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard> : null}

      {showTrialExperiment ? <DashboardCard title="Trial length A/B/C test" action={<span className="text-xs text-muted-foreground">{windowLabel}</span>} contentClassName="min-w-0 p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] text-sm">
            <thead><tr className="border-b border-black/10 text-left text-xs text-black/50"><Th>Variant</Th><Th right>Visitors</Th><Th right>Payment page</Th><Th right>Page rate</Th><Th right>Trial</Th><Th right>Trial rate</Th><Th right>Paid</Th><Th right>Paid rate</Th><Th right>Revenue</Th></tr></thead>
            <tbody>
              {(analytics.trialExperiment ?? []).map((row, index) => (
                <tr key={row.variant} className="border-b border-black/[0.07]">
                  <Td><div className="flex items-center gap-2"><Badge>Variant {variantLetter(index)}</Badge><span className="font-medium">{row.label}</span></div></Td>
                  <NumberTd>{formatInt(row.visitors)}</NumberTd><NumberTd>{formatInt(row.paymentPageViews)}</NumberTd><NumberTd>{formatPercent(ratio(row.paymentPageViews, row.visitors))}</NumberTd><NumberTd>{formatInt(row.trials)}</NumberTd><NumberTd>{formatPercent(ratio(row.trials, row.visitors))}</NumberTd><NumberTd>{formatInt(row.paid)}</NumberTd><NumberTd>{formatPercent(ratio(row.paid, row.visitors))}</NumberTd><NumberTd>{formatCurrency(row.revenue)}</NumberTd>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard> : null}

      <DashboardCard title="Source performance" action={<span className="text-xs text-muted-foreground">{windowLabel}</span>} className="overflow-visible" bodyWrapClassName="overflow-visible" contentClassName="min-w-0 overflow-visible p-0">
        <BreakdownTable rows={sources.slice(0, PREVIEW_ROWS)} label="Source" getLabel={(row) => row.channelLabel ?? row.channel ?? "Unknown"} />
      </DashboardCard>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <DashboardCard title="Countries" className="overflow-visible" bodyWrapClassName="overflow-visible" contentClassName="min-w-0 overflow-visible p-0">
          <BreakdownTable rows={countries} label="Country" getLabel={(row) => countryName(row.country)} getPrefix={(row) => row.country ? countryFlag(row.country) : "??"} expandable />
        </DashboardCard>
        <DashboardCard title="Referrers" className="overflow-visible" bodyWrapClassName="overflow-visible" contentClassName="min-w-0 overflow-visible p-0">
          <BreakdownTable rows={referrers} label="Referrer" getLabel={(row) => row.referrerLabel ?? row.referrerHost ?? "Direct"} expandable />
        </DashboardCard>
      </div>

      <DashboardCard title="Recent conversions" contentClassName="min-w-0 p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[54rem] text-sm">
            <thead><tr className="border-b border-black/10 text-left text-xs text-black/50"><Th>Event</Th><Th>Source</Th><Th>Path</Th><Th>Country</Th><Th right>When</Th></tr></thead>
            <tbody>
              {recent.length > 0 ? recent.map((row) => (
                <tr key={row.id} className="border-b border-black/[0.07]">
                  <Td><Badge>{eventLabel(row.eventType)}</Badge></Td>
                  <Td><span className="font-medium">{row.channelLabel}</span>{row.referrerHost ? <span className="ml-1 text-xs text-black/45">{row.referrerHost}</span> : null}</Td>
                  <Td><span className="block max-w-64 truncate text-black/50">{row.path ?? "-"}</span></Td>
                  <Td>{row.country ? <><span className="mr-2">{countryFlag(row.country)}</span>{countryName(row.country)}</> : "-"}</Td>
                  <td className="px-4 py-3 text-right text-black/50">{relativeTime(row.occurredAt)}</td>
                </tr>
              )) : <tr><td colSpan={5} className="h-24 text-center text-sm text-black/45">No conversions yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </section>
  );
}

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return <DashboardCard title={title} contentClassName="min-w-0"><p className="truncate text-2xl font-bold tabular-nums">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p></DashboardCard>;
}

function BreakdownTable({ rows, label, getLabel, getPrefix, expandable = false }: { rows: AppSprintFunnelBreakdownRow[]; label: string; getLabel: (row: AppSprintFunnelBreakdownRow) => string; getPrefix?: (row: AppSprintFunnelBreakdownRow) => string; expandable?: boolean }) {
  const visible = expandable ? rows.slice(0, PREVIEW_ROWS) : rows;
  const hidden = expandable ? rows.slice(PREVIEW_ROWS) : [];
  const maxVisits = Math.max(0, ...rows.map((row) => row.visits));
  const maxRevenue = Math.max(0, ...rows.map((row) => row.revenue));
  return (
    <div className="min-w-0 overflow-visible">
      <table className="w-full min-w-96 text-sm">
        <thead><tr className="border-b border-black/10 text-left text-xs text-black/50"><Th>{label}</Th><Th right>Visits</Th></tr></thead>
        <tbody>{visible.length ? visible.map((row, index) => <BreakdownRow key={`${getLabel(row)}-${index}`} row={row} label={getLabel(row)} prefix={getPrefix?.(row)} maxVisits={maxVisits} maxRevenue={maxRevenue} />) : <tr><td colSpan={2} className="h-24 text-center text-sm text-black/45">No {label.toLowerCase()} data yet.</td></tr>}</tbody>
      </table>
      {hidden.length ? <details className="group border-t border-black/[0.07]"><summary className="cursor-pointer list-none px-4 py-2.5 text-center text-xs font-medium text-black/50 hover:bg-black/[0.025]">Show {hidden.length} more</summary><table className="w-full min-w-96 text-sm"><tbody>{hidden.map((row, index) => <BreakdownRow key={`${getLabel(row)}-hidden-${index}`} row={row} label={getLabel(row)} prefix={getPrefix?.(row)} maxVisits={maxVisits} maxRevenue={maxRevenue} />)}</tbody></table></details> : null}
    </div>
  );
}

function BreakdownRow({ row, label, prefix, maxVisits, maxRevenue }: { row: AppSprintFunnelBreakdownRow; label: string; prefix?: string; maxVisits: number; maxRevenue: number }) {
  const hasRevenueScale = maxRevenue > 0;
  const visitWidth = barPercent(row.visits, maxVisits, hasRevenueScale ? VISITOR_BAR_SHARE : 100);
  const revenueWidth = barPercent(row.revenue, maxRevenue, REVENUE_BAR_SHARE);
  const barWidth = Math.min(100, visitWidth + revenueWidth);
  const rowPrefix = prefix ?? <ArrowDownRight className="size-4" />;
  const tooltipMetrics = [
    {
      label: "Visitors",
      value: formatInt(row.visits),
      color: VISITOR_BLUE,
    },
    {
      label: "Checkout",
      value: `${formatInt(row.asoCheckouts)} (${formatPercent(ratio(row.asoCheckouts, row.visits))})`,
      color: "oklch(0.55 0.02 250)",
    },
    {
      label: "Paid",
      value: `${formatCurrency(row.revenue)} (${formatPercent(ratio(row.asoPaid, row.visits))})`,
      color: POSTBACK_TINT_ORANGE,
    },
  ];
  return (
    <tr className="group/row relative h-9 border-0 outline-none" tabIndex={0}>
      <td colSpan={2} className="relative overflow-visible p-0">
        <div className="mx-0.5 grid h-8 grid-cols-[minmax(0,1fr)_4rem] items-center">
          <div className="relative h-full min-w-0 overflow-hidden rounded-r-md">
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-y-0 left-0 ${revenueWidth > 0 ? "" : "rounded-r-md"}`}
              style={{
                width: `${visitWidth}%`,
                backgroundColor: `color-mix(in oklch, ${VISITOR_BLUE}, white 30%)`,
                backgroundImage: `linear-gradient(to bottom, color-mix(in oklch, ${VISITOR_BLUE}, white 15%), ${VISITOR_BLUE})`,
                boxShadow: `inset 0 1px 0 0 color-mix(in oklch, ${VISITOR_BLUE}, white 30%), 0 0 0 1px color-mix(in oklch, ${VISITOR_BLUE}, black 10%), 0 1px 2px rgb(0 0 0 / 5%)`,
              }}
            />
            {revenueWidth > 0 ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 rounded-r-md"
                style={{
                  left: `${visitWidth}%`,
                  width: `${revenueWidth}%`,
                  backgroundColor: `color-mix(in oklch, ${POSTBACK_TINT_ORANGE}, white 30%)`,
                  backgroundImage: `linear-gradient(to bottom, color-mix(in oklch, ${POSTBACK_TINT_ORANGE}, white 15%), ${POSTBACK_TINT_ORANGE})`,
                  boxShadow: `inset 0 1px 0 0 color-mix(in oklch, ${POSTBACK_TINT_ORANGE}, white 30%), 0 0 0 1px color-mix(in oklch, ${POSTBACK_TINT_ORANGE}, black 10%), 0 1px 2px rgb(0 0 0 / 5%)`,
                }}
              />
            ) : null}
            <div className="relative z-10 flex h-full min-w-0 items-center gap-2 px-2 font-medium text-black">
              <span className="flex size-5 shrink-0 items-center justify-center">{rowPrefix}</span>
              <span className="truncate">{label}</span>
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-20 overflow-hidden" style={{ width: `${barWidth}%` }}>
              <div className="flex h-full w-max items-center gap-2 px-2 font-medium text-white">
                <span className="flex size-5 shrink-0 items-center justify-center">{rowPrefix}</span>
                <span>{label}</span>
              </div>
            </div>
          </div>
          <span className="pr-2 text-right font-mono text-xs font-medium tabular-nums text-black/70">{formatInt(row.visits)}</span>
        </div>
        <div className="pointer-events-none absolute bottom-[calc(100%-2px)] left-1/2 z-50 hidden min-w-48 -translate-x-1/2 gap-2 rounded-lg border border-black/20 bg-white px-2.5 py-2 text-xs shadow-xl group-hover/row:grid group-focus/row:grid">
          <div className="font-medium text-black">Details</div>
          <div className="grid gap-1.5">
            {tooltipMetrics.map((metric) => (
              <div key={metric.label} className="flex items-center justify-between gap-6 text-black/55">
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: metric.color }} />
                  <span>{metric.label}</span>
                </span>
                <span className="font-mono font-medium tabular-nums text-black">
                  {metric.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </td>
    </tr>
  );
}

function Th({ children, right = false }: { children: React.ReactNode; right?: boolean }) { return <th className={`px-4 py-3 font-medium ${right ? "text-right" : ""}`}>{children}</th>; }
function Td({ children }: { children: React.ReactNode }) { return <td className="px-4 py-3">{children}</td>; }
function NumberTd({ children }: { children: React.ReactNode }) { return <td className="px-4 py-3 text-right font-mono tabular-nums">{children}</td>; }
function Badge({ children }: { children: React.ReactNode }) { return <span className="inline-flex rounded-md bg-black/[0.055] px-2 py-0.5 text-xs font-medium">{children}</span>; }

function sortRows<T extends AppSprintFunnelBreakdownRow>(rows: T[]) { return [...rows].sort((a, b) => b.visits - a.visits || b.revenue - a.revenue || totalConversions(b) - totalConversions(a)); }
function totalConversions(row: AppSprintFunnelBreakdownRow) { return row.bookCallClicks + row.bookCallStarted + row.asoCheckouts + row.asoTrials + row.asoPaid; }
function barPercent(value: number, maxValue: number, maxWidth: number) { if (value <= 0 || maxValue <= 0 || maxWidth <= 0) return 0; return Math.min(maxWidth, Math.max(Math.min(2, maxWidth), (value / maxValue) * maxWidth)); }
function ratio(part: number, total: number) { return total > 0 ? part / total : 0; }
function formatInt(value: number) { return finite(value).toLocaleString("en", { maximumFractionDigits: 0 }); }
function formatPercent(value: number) { return `${(finite(value) * 100).toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`; }
function variantLetter(index: number) { return String.fromCharCode(65 + Math.max(0, index)); }
function formatCurrency(value: number) { return new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(finite(value)); }
function formatPreciseCurrency(value: number) { return new Intl.NumberFormat("en", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(finite(value)); }
function finite(value: number) { return Number.isFinite(value) ? value : 0; }
function countryFlag(code: string) { return code.toUpperCase().replace(/./g, (character) => String.fromCodePoint(127397 + character.charCodeAt(0))); }
function countryName(code: string | null | undefined) { if (!code) return "Unknown"; try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code; } catch { return code; } }
function eventLabel(type: string) { return ({ book_call_started: "Booked call", aso_checkout_started: "ASO checkout", aso_trial_started: "ASO trial", aso_paid: "ASO paid", postback_checkout_started: "Postback checkout", postback_trial_started: "Postback trial", postback_paid: "Postback paid", community_checkout_started: "Community checkout", community_paid: "Community paid", community_renewal: "Community renewal" } as Record<string, string>)[type] ?? "Visit"; }
function relativeTime(value: string) { const seconds = Math.round((Date.parse(value) - Date.now()) / 1000); const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" }); if (Math.abs(seconds) < 60) return formatter.format(seconds, "second"); const minutes = Math.round(seconds / 60); if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute"); const hours = Math.round(minutes / 60); if (Math.abs(hours) < 24) return formatter.format(hours, "hour"); return formatter.format(Math.round(hours / 24), "day"); }
