import { observedSessionDays } from "./experiment-session-rate";

type Install = { appUserId: string; installedAt: number };
type Session = { id: string; appUserId: string; eventTs: number };

/** All assigned installs contribute observed time, including people with no sessions or purchases. */
export function onboardingSessionActivity(installs: Install[], sessions: Session[], from: number, to: number) {
  const activity = new Map<string, { sessions: number; sessionUserDays: number }>();
  const starts = new Map<string, number>();
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return activity;
  for (const install of installs) {
    if (!install.appUserId || !Number.isFinite(install.installedAt) || install.installedAt >= to) continue;
    starts.set(install.appUserId, Math.min(starts.get(install.appUserId) ?? Infinity, Math.max(from, install.installedAt)));
  }
  for (const [user, start] of starts) {
    activity.set(user, { sessions: 0, sessionUserDays: observedSessionDays(start, from, to) });
  }
  const seen = new Set<string>();
  for (const session of sessions) {
    const start = starts.get(session.appUserId);
    const key = `${session.appUserId}:${session.id}`;
    if (!session.id || start === undefined || !Number.isFinite(session.eventTs)
      || session.eventTs < start || session.eventTs >= to || seen.has(key)) continue;
    seen.add(key);
    activity.get(session.appUserId)!.sessions++;
  }
  return activity;
}
