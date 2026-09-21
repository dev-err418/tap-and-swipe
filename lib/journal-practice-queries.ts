import { buildJournalPracticeReport, JOURNAL_PRACTICE_KEY, type JournalPracticeAttribute, type JournalPracticeReport } from "./journal-practice-analytics";

type Query = <T>(sql: string) => Promise<T[]>;
const quote = (value: string) => `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;

export async function loadJournalPractice(query: Query, applicationId: number, start: number, end: number): Promise<JournalPracticeReport> {
  const asOf = Date.now();
  try {
    const attributes: JournalPracticeAttribute[] = [];
    let cursor: string | undefined;
    for (;;) {
      const rows = await query<JournalPracticeAttribute>(`
SELECT appUserId, key, value FROM sw.user_attributes_rep FINAL
WHERE applicationId = ${applicationId} AND isSandbox = 0 AND isDeleted = 0 AND ts < now()
  AND key = '${JOURNAL_PRACTICE_KEY}'
  ${cursor === undefined ? "" : `AND appUserId > ${quote(cursor)}`}
ORDER BY appUserId LIMIT 10000 FORMAT JSON`);
      attributes.push(...rows);
      if (rows.length < 10000) break;
      const next = rows.at(-1)!.appUserId;
      if (attributes.length >= 200000 || next === cursor) throw new Error("Activity reporting limit reached");
      cursor = next;
    }
    return buildJournalPracticeReport(attributes, start, end, asOf);
  } catch {
    // No partial report: a failed page must not silently shrink the denominator.
    return { status: "unavailable", asOf, rows: [], warnings: ["Journal VS Practice reporting is unavailable. Refresh to retry."] };
  }
}
