/** App analytics use Paris wall time; stored/transmitted timestamps remain UTC. */
export const APP_ANALYTICS_TIME_ZONE = "Europe/Paris";
type Period = "day" | "yesterday" | "3days" | "week" | "month" | "all";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const parisParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_ANALYTICS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function parisDatetimeLocalValue(date: Date): string {
  const parts = Object.fromEntries(parisParts.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Reject nonexistent spring-forward times. For a repeated autumn hour, retain
 * an existing note's instant when unchanged; new notes use the first occurrence.
 */
export function parisDatetimeToDate(value: string, existing?: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Enter a valid Paris date and time.");
  const wall = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wall)) throw new Error("Enter a valid Paris date and time.");
  if (existing && Number.isFinite(Date.parse(existing)) && parisDatetimeLocalValue(new Date(existing)) === value) return new Date(existing);
  // Obtain offsets on both sides of a possible DST transition without assuming UTC+1/+2.
  const offsets = new Set([-36, -12, 0, 12, 36].map((hours) => {
    const probe = wall + hours * HOUR;
    return Date.parse(`${parisDatetimeLocalValue(new Date(probe))}:00Z`) - probe;
  }));
  const candidates = [...offsets].map((offset) => new Date(wall - offset))
    .filter((date) => parisDatetimeLocalValue(date) === value)
    .sort((a, b) => a.getTime() - b.getTime());
  if (!candidates.length) throw new Error("This Paris time does not exist because of the daylight-saving change. Choose another time.");
  return candidates[0];
}

export function appAnalyticsPeriodRange(period: Period, now = new Date()) {
  const before = new Date(now);
  const localDay = parisDatetimeLocalValue(before).slice(0, 10);
  const today = parisDatetimeToDate(`${localDay}T00:00`);
  if (period === "day") return { since: today, before };
  if (period === "yesterday") {
    const yesterday = new Date(Date.parse(`${localDay}T00:00:00Z`) - DAY).toISOString().slice(0, 10);
    return { since: parisDatetimeToDate(`${yesterday}T00:00`), before: today };
  }
  const days = period === "3days" ? 3 : period === "week" ? 7 : period === "month" ? 30 : null;
  return { since: days ? new Date(before.getTime() - days * DAY) : parisDatetimeToDate("2024-01-01T00:00"), before };
}

export function appAnalyticsTrendBucket(date: Date, period: Period): Date {
  // Paris uses whole-hour offsets: UTC rounding keeps both repeated autumn hours distinct.
  if (period === "day" || period === "yesterday" || period === "3days") return new Date(Math.floor(date.getTime() / HOUR) * HOUR);
  const local = parisDatetimeLocalValue(date);
  const hour = period === "week" ? Math.floor(Number(local.slice(11, 13)) / 4) * 4 : 0;
  return parisDatetimeToDate(`${local.slice(0, 10)}T${String(hour).padStart(2, "0")}:00`);
}

/** Return UTC-serialized instants, NOT Paris strings that would later be parsed as UTC.
 * Four-hour buckets are 00/04/08/12/16/20 on the Paris clock, also on DST days.
 */
export function appAnalyticsBucketSql(period: Period): string {
  const zone = `'${APP_ANALYTICS_TIME_ZONE}'`;
  if (period === "day" || period === "yesterday" || period === "3days") return "toStartOfHour(toTimeZone(ts, 'UTC'))";
  if (period === "week") return `toTimeZone(toDateTime(concat(toString(toDate(ts, ${zone})), ' ', leftPad(toString(intDiv(toHour(ts, ${zone}), 4) * 4), 2, '0'), ':00:00'), ${zone}), 'UTC')`;
  return `toTimeZone(toStartOfDay(toTimeZone(ts, ${zone})), 'UTC')`;
}
