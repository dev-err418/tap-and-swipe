import type { JournalPracticeReport, ReturnMetric } from "@/lib/journal-practice-analytics";

function ReturnRate({ metric }: { metric: ReturnMetric }) {
  return <><span>{metric.rate === null ? "—" : `${(metric.rate * 100).toFixed(1)}%`}</span>
    <span className="block text-xs text-muted-foreground">{metric.retained} / {metric.eligible} eligible</span></>;
}

export default function JournalPracticePanel({ report }: { report: JournalPracticeReport | null }) {
  return <section className="space-y-4 rounded-[28px] bg-white p-6" aria-label="Journal VS Practice">
    <div>
      <h3 className="text-lg font-semibold">Journal VS Practice</h3>
      <p className="text-sm text-muted-foreground">50% Journal · 50% Practice · stable assignment per installation</p>
    </div>
    <p className="text-sm text-muted-foreground">Prepared for the next release. Production enrollment stays off until the Practice experience is ready. Debug previews are excluded.</p>
    {!report || report.status === "unavailable" ? <p role="status">Activity reporting is unavailable. Refresh to retry.</p>
      : <>
        {report.status === "empty" && <p>No production assignments in this date range yet.</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <caption className="sr-only">App-return retention and sessions for the selected assignment cohort</caption>
            <thead><tr className="border-b">
              {["Variant", "Assigned users", "D1 return", "D7 return", "D30 return", "Sessions / user / day"].map((label) => <th key={label} scope="col" className="px-3 py-3 font-medium">{label}</th>)}
            </tr></thead>
            <tbody>{report.rows.map((row) => <tr key={row.variant} className="border-b last:border-0">
              <th scope="row" className="px-3 py-4 font-medium">{row.label}</th>
              <td className="px-3 py-4">{row.users.toLocaleString()}</td>
              <td className="px-3 py-4"><ReturnRate metric={row.d1} /></td>
              <td className="px-3 py-4"><ReturnRate metric={row.d7} /></td>
              <td className="px-3 py-4"><ReturnRate metric={row.d30} /></td>
              <td className="px-3 py-4">{row.sessionsPerUserDayD7?.toFixed(2) ?? "—"}
                <span className="block text-xs text-muted-foreground">{row.sessionUsersD7} users · first 7 days</span></td>
            </tr>)}</tbody>
          </table>
        </div>
      </>}
    {report?.warnings.map((warning) => <p key={warning} className="text-sm text-amber-800">{warning}</p>)}
    <p className="text-xs leading-relaxed text-muted-foreground">Dates select assignment cohorts, followed through today. Return means foreground app activity in the elapsed 24-hour window at day 1, 7 or 30—not subscription retention. Only fully observed windows qualify. Sessions count cold launches and returns after 30 minutes in the background. The first-seven-day average includes non-returners and zero-session days. Data arrives eventually; no winner is declared from these descriptive results.</p>
  </section>;
}
