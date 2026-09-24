import assert from "node:assert/strict";
import test from "node:test";
import { observedSessionDays, sessionsPerUserDay } from "../../lib/experiment-session-rate";

const DAY = 86_400_000;

test("historical and current session windows use their own observed person-days", () => {
  const history = { users: 2, sessions: 30, sessionUserDays:
    observedSessionDays(0, 0, 30 * DAY) + observedSessionDays(15 * DAY, 0, 30 * DAY) };
  const current = { users: 1, sessions: 7, sessionUserDays: observedSessionDays(30 * DAY, 30 * DAY, 37 * DAY) };
  const combined = { users: history.users + current.users, sessions: history.sessions + current.sessions,
    sessionUserDays: history.sessionUserDays + current.sessionUserDays };
  assert.equal(history.sessionUserDays, 45);
  assert.equal(current.sessionUserDays, 7);
  assert.equal(sessionsPerUserDay(combined, 7), 37 / 52);
  assert.notEqual(sessionsPerUserDay(combined, 7), 37 / (3 * 7));
});
