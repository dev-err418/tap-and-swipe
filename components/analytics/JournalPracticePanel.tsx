import type { JournalPracticeReport, ReturnMetric } from "@/lib/journal-practice-analytics";
import { AppExperimentLayout, ExperimentTable, ExperimentTh, ExperimentTd, ExperimentNumberTd, ExperimentVariantLabel } from "@/components/analytics/AppExperimentLayout";

function ReturnRate({ metric }: { metric: ReturnMetric }) {
  return <><span>{metric.rate === null ? "—" : `${(metric.rate * 100).toFixed(1)}%`}</span>
    <span className="block font-sans text-xs text-muted-foreground">{metric.retained} / {metric.eligible} eligible</span></>;
}

export default function JournalPracticePanel({ report }: { report: JournalPracticeReport | null }) {
  return <AppExperimentLayout title="Journal VS Practice" label="Journal VS Practice"
    subtitle="30% Journal · 70% Practice">
    <p className="border-b border-black/[0.08] px-4 py-4 text-xs text-muted-foreground">Enabled in the next app release: 30% Journal / 70% Practice. Enrollment starts after onboarding when users run that build. Debug and sandbox activity are excluded. Assignment stays stable per installation.</p>
    {!report || report.status === "unavailable"
      ? <p role="status" className="px-4 py-4 text-sm text-muted-foreground">Activity reporting is unavailable. Refresh to retry.</p>
      : <>
        {report.status === "empty" && <p role="status" className="px-4 py-4 text-sm text-muted-foreground">No production assignments in this date range yet.</p>}
        <ExperimentTable caption="App-return retention and sessions for the selected assignment cohort" headings={<>
          <ExperimentTh>Variant</ExperimentTh>
          {["Assigned users", "D1 return", "D7 return", "D30 return", "Sessions / user / day"].map((label) => <ExperimentTh key={label} right>{label}</ExperimentTh>)}
        </>}>
          {report.rows.map((row, index) => <tr key={row.variant} className="border-b border-black/[0.07]">
            <ExperimentTd><ExperimentVariantLabel index={index}>{row.label}</ExperimentVariantLabel></ExperimentTd>
            <ExperimentNumberTd>{row.users.toLocaleString()}</ExperimentNumberTd>
            <ExperimentNumberTd><ReturnRate metric={row.d1} /></ExperimentNumberTd>
            <ExperimentNumberTd><ReturnRate metric={row.d7} /></ExperimentNumberTd>
            <ExperimentNumberTd><ReturnRate metric={row.d30} /></ExperimentNumberTd>
            <ExperimentNumberTd>{row.sessionsPerUserDayD7?.toFixed(2) ?? "—"}
              <span className="block font-sans text-xs text-muted-foreground">{row.sessionUsersD7} users · first 7 days</span>
            </ExperimentNumberTd>
          </tr>)}
        </ExperimentTable>
      </>}
    {report?.warnings.map((warning) => <p role="status" key={warning} className="px-4 pt-3 text-xs text-amber-800">{warning}</p>)}
    <p className="px-4 py-4 text-xs leading-relaxed text-muted-foreground">Dates select assignment cohorts, followed through today. Return means foreground app activity in the elapsed 24-hour window at day 1, 7 or 30—not subscription retention. Only fully observed windows qualify. Sessions count cold launches and returns after 30 minutes in the background. The first-seven-day average includes non-returners and zero-session days. Data arrives eventually; no winner is declared from these descriptive results.</p>
  </AppExperimentLayout>;
}
