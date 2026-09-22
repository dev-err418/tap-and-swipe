import type { JournalPracticeReport, ReturnMetric } from "@/lib/journal-practice-analytics";
import { AppExperimentLayout, ExperimentTable, ExperimentTh, ExperimentTd, ExperimentNumberTd, ExperimentVariantLabel } from "@/components/analytics/AppExperimentLayout";

function ReturnRate({ metric }: { metric: ReturnMetric }) {
  return <><span>{metric.rate === null ? "—" : `${(metric.rate * 100).toFixed(1)}%`}</span>
    <span className="block font-sans text-xs text-muted-foreground">{metric.retained} / {metric.eligible} eligible</span></>;
}

export default function JournalPracticePanel({ report }: { report: JournalPracticeReport | null }) {
  return <AppExperimentLayout title="Journal VS Practice" label="Journal VS Practice"
    subtitle="30% Journal · 70% Practice">
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
  </AppExperimentLayout>;
}
