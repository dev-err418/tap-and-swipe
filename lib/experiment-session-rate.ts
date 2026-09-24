import type { MobileAppExperimentSlice } from "./mobile-app-analytics";

type SessionSlice = Pick<MobileAppExperimentSlice, "users" | "sessions" | "sessionUserDays">;

const DAY = 86_400_000;

export function observedSessionDays(installedAt: number, from: number, to: number) {
  return Math.max(0, to - Math.max(from, installedAt)) / DAY;
}

/** Person-days observed for this cohort; older fixtures use their fixed window. */
export function sessionUserDays(row: SessionSlice, fallbackDays: number) {
  return row.sessionUserDays ?? row.users * Math.max(fallbackDays, 0);
}

export function sessionsPerUserDay(row: SessionSlice, fallbackDays: number) {
  const days = sessionUserDays(row, fallbackDays);
  return days > 0 ? row.sessions / days : 0;
}

/** Express aggregate sessions in one-user units for experiment analysis. */
export function normalizedSessions(row: SessionSlice, fallbackDays: number) {
  return sessionsPerUserDay(row, fallbackDays) * row.users;
}
