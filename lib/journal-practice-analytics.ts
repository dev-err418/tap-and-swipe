export const JOURNAL_PRACTICE_ID = "journal_vs_practice_v1";
export const JOURNAL_PRACTICE_KEY = "gjp1_journal_vs_practice_v1";
export const DAY_MS = 86_400_000;

export type JournalPracticeAttribute = { appUserId: string; key: string; value: string };
type Activity = { sessions: number; active: boolean; opens: number };
type RecordValue = {
  schema: 1; experiment: string; environment: string; variant: "journal" | "practice";
  assignedAt: number; updatedAt: number; language: string; randomized: boolean;
  days: Record<string, Activity>;
};
export type ReturnMetric = { eligible: number; retained: number; rate: number | null };
export type JournalPracticeRow = {
  variant: "journal" | "practice"; label: string; users: number;
  d1: ReturnMetric; d7: ReturnMetric; d30: ReturnMetric;
  sessionUsersD7: number; sessionsD7: number; sessionsPerUserDayD7: number | null;
};
export type JournalPracticeReport = {
  status: "ready" | "empty" | "unavailable"; asOf: number;
  rows: JournalPracticeRow[]; warnings: string[];
};

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 10000;

/** Reject malformed or future activity rather than making it look like non-returning users. */
function parse(value: string, asOf: number): RecordValue | null {
  try {
    let record: unknown = JSON.parse(value);
    if (typeof record === "string") record = JSON.parse(record);
    if (!object(record) || record.schema !== 1 || record.experiment !== JOURNAL_PRACTICE_ID
      || !["journal", "practice"].includes(String(record.variant))
      || typeof record.environment !== "string" || typeof record.language !== "string"
      || typeof record.randomized !== "boolean"
      || typeof record.assignedAt !== "number" || !Number.isFinite(record.assignedAt) || record.assignedAt <= 0
      || typeof record.updatedAt !== "number" || !Number.isFinite(record.updatedAt)
      || record.updatedAt < record.assignedAt || record.updatedAt > asOf
      || !object(record.days)) return null;
    const lastDay = Math.floor((record.updatedAt - record.assignedAt) / DAY_MS);
    for (const [day, activity] of Object.entries(record.days)) {
      if (!/^(0|[1-9]|[12][0-9]|30)$/.test(day) || Number(day) > lastDay
        || !object(activity) || !count(activity.sessions) || !count(activity.opens)
        || activity.active !== true) return null;
    }
    if (!object(record.days["0"]) || !count(record.days["0"].sessions) || record.days["0"].sessions < 1) return null;
    return record as RecordValue;
  } catch { return null; }
}

export function buildJournalPracticeReport(attributes: JournalPracticeAttribute[], start: number, end: number, asOf: number): JournalPracticeReport {
  const warnings: string[] = [];
  const records = new Map<string, RecordValue>();
  const rejected = new Set<string>();
  for (const attribute of attributes) {
    if (attribute.key !== JOURNAL_PRACTICE_KEY) continue;
    const record = parse(attribute.value, asOf);
    if (!record || !attribute.appUserId) { rejected.add(attribute.appUserId); continue; }
    const previous = records.get(attribute.appUserId);
    if (previous && JSON.stringify(previous) !== JSON.stringify(record)) { rejected.add(attribute.appUserId); continue; }
    records.set(attribute.appUserId, record);
  }
  if (rejected.size) warnings.push(`${rejected.size} invalid or conflicting user records were excluded. Investigate before interpreting results.`);
  const cohort = [...records].filter(([id, r]) => !rejected.has(id) && r.environment === "production" && r.randomized
    && r.assignedAt >= start && r.assignedAt < end && r.assignedAt <= asOf).map(([, record]) => record);
  const rows = (["journal", "practice"] as const).map((variant): JournalPracticeRow => {
    const users = cohort.filter((r) => r.variant === variant);
    const retention = (day: number): ReturnMetric => {
      // Only complete return windows qualify: D7 is [168h,192h), mature at 192h.
      const eligible = users.filter((r) => r.assignedAt + (day + 1) * DAY_MS <= asOf);
      const retained = eligible.filter((r) => r.days[String(day)]?.active).length;
      return { eligible: eligible.length, retained, rate: eligible.length ? retained / eligible.length : null };
    };
    // A common seven-day observation window prevents younger cohorts biasing the comparison.
    const mature = users.filter((r) => r.assignedAt + 7 * DAY_MS <= asOf);
    const sessionsD7 = mature.reduce((sum, r) => sum + Object.entries(r.days)
      .filter(([day]) => Number(day) < 7).reduce((total, [, day]) => total + day.sessions, 0), 0);
    return {
      variant, label: variant === "journal" ? "Journal" : "Practice", users: users.length,
      d1: retention(1), d7: retention(7), d30: retention(30),
      sessionUsersD7: mature.length, sessionsD7,
      sessionsPerUserDayD7: mature.length ? sessionsD7 / (mature.length * 7) : null,
    };
  });
  return { status: cohort.length ? "ready" : "empty", asOf, rows, warnings };
}
