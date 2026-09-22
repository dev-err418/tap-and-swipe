import type { JournalPracticeReport, ReturnMetric } from "@/lib/journal-practice-analytics";
import { AppExperimentLayout, ExperimentTable, ExperimentTh, ExperimentTd, ExperimentNumberTd, ExperimentVariantLabel } from "@/components/analytics/AppExperimentLayout";
import ExperimentStats from "@/components/analytics/ExperimentStats";
import { journalPracticeComparisons } from "@/lib/journal-practice-comparison";

function ReturnRate({ metric }: { metric: ReturnMetric }) {
  return <><span>{metric.rate === null ? "—" : `${(metric.rate * 100).toFixed(1)}%`}</span>
    </>;
}

export default function JournalPracticePanel({ report }: { report: JournalPracticeReport | null }) {
  return <AppExperimentLayout title="Journal VS Practice" label="Journal VS Practice"
    subtitle="30% Journal · 70% Practice">
    {!report || report.status === "unavailable"
      ? <p role="status" className="px-4 py-4 text-sm text-muted-foreground">Activity reporting is unavailable. Refresh to retry.</p>
      : <>
        {report.status === "empty" && <p role="status" className="px-4 py-4 text-sm text-muted-foreground">No production assignments in this date range yet.</p>}
        {journalPracticeComparisons(report).map(({ title, analysis }) => (
          <ExperimentStats key={title} title={title} titleClassName="font-bold" analysis={analysis} />
        ))}
        <ExperimentTable caption="App-return retention and sessions for the selected assignment cohort" headings={<>
          <ExperimentTh>Variant</ExperimentTh>
          {["Assigned users", "D1 return", "D7 return", "Sessions / user / day"].map((label) => <ExperimentTh key={label} right>{label}</ExperimentTh>)}
        </>}>
          {report.rows.map((row, index) => <tr key={row.variant} className="border-b border-black/[0.07]">
            <ExperimentTd><ExperimentVariantLabel index={index}>{row.label}</ExperimentVariantLabel></ExperimentTd>
            <ExperimentNumberTd>{row.users.toLocaleString()}</ExperimentNumberTd>
            <ExperimentNumberTd><span title={`${row.d1.retained} / ${row.d1.eligible} eligible users`}><ReturnRate metric={row.d1} /></span></ExperimentNumberTd>
            <ExperimentNumberTd><span title={`${row.d7.retained} / ${row.d7.eligible} eligible users`}><ReturnRate metric={row.d7} /></span></ExperimentNumberTd>
            <ExperimentNumberTd><span title={`${row.sessionUsersD7} users · first 7 days`}>{row.sessionsPerUserDayD7?.toFixed(2) ?? "—"}</span>
            </ExperimentNumberTd>
          </tr>)}
        </ExperimentTable>
      </>}
  </AppExperimentLayout>;
}
