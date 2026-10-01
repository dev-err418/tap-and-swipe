import type { GlowOnboardingReport } from "@/lib/glow-onboarding-experience";
import { AppExperimentLayout, ExperimentTable, ExperimentTh, ExperimentTd, ExperimentNumberTd, ExperimentVariantLabel } from "./AppExperimentLayout";
import ExperimentStats from "./ExperimentStats";
import { analyzeExperiment } from "@/lib/experiment-stats";

const currency = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value);
const duration = (ms: number | null) => ms === null ? "—" : ms < 60_000 ? `${Math.round(ms / 1000)}s`
  : ms < 3_600_000 ? `${(ms / 60_000).toFixed(1)} min` : ms < 86_400_000 ? `${(ms / 3_600_000).toFixed(1)} hr` : `${(ms / 86_400_000).toFixed(1)} days`;

export default function GlowOnboardingExperiencePanel({ report }: { report: GlowOnboardingReport | null }) {
  const analysis = report?.status === "ready" && report.warnings.length === 0
    ? analyzeExperiment(report.rows.map((r) => ({ key: r.variant, label: r.label, exposures: r.users,
      conversions: r.paid, revenue: r.proceeds ?? 0, variance: r.proceedsVariance ?? 0 })), "revenue_per_visitor", "ARPU") : null;
  return <AppExperimentLayout title="Onboarding experience" label="Onboarding experience" subtitle="15% Current · 85% No mascot">
    {!report || report.status === "unavailable" ? <p role="status" className="px-4 py-4 text-sm text-muted-foreground">Onboarding reporting is unavailable. Refresh to retry.</p> : <>
      {report.status === "empty" && <p role="status" className="px-4 py-4 text-sm text-muted-foreground">Prepared · enrollment is off while the new experience is being built. No production assignments in this cohort yet.</p>}
      {report.warnings.map((warning) => <p role="status" key={warning} className="px-4 py-3 text-sm text-muted-foreground">{warning}</p>)}
      {analysis && <ExperimentStats title="ARPU" titleClassName="font-bold" analysis={analysis} />}
      <ExperimentTable caption="All assigned users, including non-payers and unfinished onboarding" headings={<>
        <ExperimentTh>Variant</ExperimentTh>
        {["Assigned users", "Onboarding completion", "Net proceeds", "ARPU", "Sessions / user / day", "Avg time to cancel"].map((label) => <ExperimentTh key={label} right>{label}</ExperimentTh>)}
      </>}>
        {report.rows.map((row, index) => <tr key={row.variant} className="border-b border-black/[0.07]">
          <ExperimentTd><ExperimentVariantLabel index={index}>{row.label}</ExperimentVariantLabel></ExperimentTd>
          <ExperimentNumberTd>{row.users.toLocaleString()}</ExperimentNumberTd>
          <ExperimentNumberTd><span title={`${row.completed} / ${row.users} assigned users`}>{row.users ? `${(100 * row.completed / row.users).toFixed(1)}%` : "—"}</span></ExperimentNumberTd>
          <ExperimentNumberTd>{row.users ? currency(row.proceeds) : "—"}</ExperimentNumberTd>
          <ExperimentNumberTd><span title="All net proceeds since assignment / all assigned users, including non-payers">{currency(row.arpu)}</span></ExperimentNumberTd>
          <ExperimentNumberTd><span title={`${row.sessions} sessions / ${row.sessionUserDays.toFixed(2)} observed user-days, including inactive days; up to 31 days per user`}>{row.sessionsPerUserDay?.toFixed(2) ?? "—"}</span></ExperimentNumberTd>
          <ExperimentNumberTd><span title={`First subscription or trial start to first cancellation; ${row.cancelledUsers} cancelled users; active subscriptions excluded`}>{duration(row.avgTimeToCancelMs)}{row.avgTimeToCancelMs !== null && <span className="ml-1 text-xs text-muted-foreground">({row.cancelledUsers})</span>}</span></ExperimentNumberTd>
        </tr>)}
      </ExperimentTable>
      <p className="px-4 py-3 text-xs text-muted-foreground">Sessions cover each user’s first 31 days. Time to cancel starts at the first subscription or trial and averages only users who cancelled, through today; active subscriptions and refunds are excluded.</p>
    </>}
  </AppExperimentLayout>;
}
