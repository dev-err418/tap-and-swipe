import { GLOW_PAYWALL_FLOW_LEGACY_ID, type GlowOnboardingReport } from "@/lib/glow-onboarding-experience";
import { AppExperimentLayout, ExperimentTable, ExperimentTh, ExperimentTd, ExperimentNumberTd, ExperimentVariantLabel } from "./AppExperimentLayout";
import ExperimentStats from "./ExperimentStats";
import { analyzeExperiment } from "@/lib/experiment-stats";

const currency = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const rate = (count: number, total: number) => total ? `${(100 * count / total).toFixed(1)}%` : "—";

export default function GlowPaywallFlowPanel({ report }: { report: GlowOnboardingReport | null }) {
  const historical = report?.experiment === GLOW_PAYWALL_FLOW_LEGACY_ID;
  const analysis = report?.status === "ready" && !report.warnings.length
    ? analyzeExperiment(report.rows.map((r) => ({ key: r.variant, label: r.label, exposures: r.users,
      conversions: r.paid, revenue: r.proceeds ?? 0, variance: r.proceedsVariance ?? 0 })), "revenue_per_visitor", "APPU") : null;
  return <AppExperimentLayout title={historical ? "Previous paywall flows" : "Paywall flows with testimonials + note"} label="Paywall flow" subtitle={historical ? "Historical 50% current · 50% reminder choice" : "80% testimonials + note · 20% original flow · equal split between flow types"}>
    {!report || report.status === "unavailable" ? <p role="status" className="px-4 py-4 text-sm text-muted-foreground">Paywall flow reporting is unavailable. Refresh to retry.</p> : <>
      {report.status === "empty" && <p role="status" className="px-4 py-4 text-sm text-muted-foreground">No production assignments yet. Results appear after the updated app is released and users enter their assigned paywall sequence.</p>}
      {report.warnings.map((warning) => <p role="status" key={warning} className="px-4 py-3 text-sm text-muted-foreground">{warning}</p>)}
      {analysis && <ExperimentStats title="Total APPU" titleClassName="font-bold" analysis={analysis} />}
      <ExperimentTable caption="Everyone entering the paywall sequence, including non-payers and users who leave before the final paywall" headings={<>
        <ExperimentTh>Flow</ExperimentTh>
        {["Assigned users", "Reached paywall", "Paid users", "Paid conversion", "Net proceeds", "Total APPU"].map((label) => <ExperimentTh key={label} right>{label}</ExperimentTh>)}
      </>}>
        {report.rows.map((row, index) => <tr key={row.variant} className="border-b border-black/[0.07]">
          <ExperimentTd><ExperimentVariantLabel index={index}>{row.label}</ExperimentVariantLabel></ExperimentTd>
          <ExperimentNumberTd>{row.users.toLocaleString()}</ExperimentNumberTd>
          <ExperimentNumberTd><span title={`${row.viewed} / ${row.users} assigned users`}>{rate(row.viewed, row.users)}</span></ExperimentNumberTd>
          <ExperimentNumberTd>{row.paid.toLocaleString()}</ExperimentNumberTd>
          <ExperimentNumberTd>{rate(row.paid, row.users)}</ExperimentNumberTd>
          <ExperimentNumberTd>{row.users ? currency(row.proceeds) : "—"}</ExperimentNumberTd>
          <ExperimentNumberTd>{currency(row.arpu)}</ExperimentNumberTd>
        </tr>)}
      </ExperimentTable>
      <p className="px-4 py-3 text-xs text-muted-foreground">Enrollment starts on the first assigned screen in either IAM or manifest-audio, including testimonials for note variants. Note variants show testimonials, then the team note, then the original three-screen flow. Users who leave on either new screen remain in the denominator. The reminder flow offers 2 or 3 days before trial expiry (adjusted for shorter trials). All four variants receive the same independent three-price × 3-day/7-day trial test. The reminder flow also offers a fixed Weekly plan without a trial in View all plans. Weekly purchases count in that user’s assigned flow; Weekly is not a separate price-test arm. Total APPU includes all post-assignment net proceeds, renewals and refunds, including recovery purchases. Free trial starts are not paid conversions. All languages; users installed on v1.8.3 or later, across all time.</p>
      {report.historical && <details className="border-t border-black/[0.07] p-4">
        <summary className="cursor-pointer text-sm font-medium">Previous 50/50 paywall-flow experiment</summary>
        <GlowPaywallFlowPanel report={report.historical} />
      </details>}
    </>}
  </AppExperimentLayout>;
}
