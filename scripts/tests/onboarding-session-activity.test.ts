import assert from "node:assert/strict";
import test from "node:test";
import { onboardingSessionActivity } from "../../lib/onboarding-session-activity";
import { sessionsPerUserDay } from "../../lib/experiment-session-rate";

const DAY = 86_400_000;
test("all users contribute observed days, including free and zero-session users", () => {
  const activity = onboardingSessionActivity([
    { appUserId: "free", installedAt: 0 },
    { appUserId: "quiet", installedAt: DAY },
    { appUserId: "new", installedAt: 1.5 * DAY },
  ], [
    { id: "a", appUserId: "free", eventTs: 0 },
    { id: "b", appUserId: "free", eventTs: DAY },
    { id: "c", appUserId: "new", eventTs: 1.5 * DAY },
  ], 0, 2 * DAY);
  assert.deepEqual(activity.get("quiet"), { sessions: 0, sessionUserDays: 1 });
  const total = [...activity.values()].reduce((sum, row) => ({
    sessions: sum.sessions + row.sessions, sessionUserDays: sum.sessionUserDays + row.sessionUserDays,
  }), { sessions: 0, sessionUserDays: 0 });
  assert.equal(sessionsPerUserDay({ ...total, users: 3 }, 2), 3 / 3.5);
});

test("sessions are deduplicated and bounded by install and reporting time", () => {
  const activity = onboardingSessionActivity([
    { appUserId: "user", installedAt: DAY },
    { appUserId: "user", installedAt: 1.5 * DAY },
    { appUserId: "future", installedAt: 3 * DAY },
  ], [
    { id: "before", appUserId: "user", eventTs: DAY - 1 },
    { id: "ok", appUserId: "user", eventTs: DAY },
    { id: "ok", appUserId: "user", eventTs: DAY },
    { id: "end", appUserId: "user", eventTs: 2 * DAY },
    { id: "unknown", appUserId: "missing", eventTs: DAY },
    { id: "invalid", appUserId: "user", eventTs: NaN },
  ], 0, 2 * DAY);
  assert.deepEqual([...activity], [["user", { sessions: 1, sessionUserDays: 1 }]]);
  assert.equal(onboardingSessionActivity([], [], 1, 0).size, 0);
});

test("session columns distinguish real zero usage from unavailable data", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { default: AppExperimentCard } = await import("../../components/analytics/AppExperimentCard");
  const variant = {
    key: "scroll_the_bible", label: "Bible Scroll", countries: {},
    users: 2, sessions: 5, sessionUserDays: 4, installs: 2, completed: 0,
    trials: 0, converted: 0, paid: 0, proceeds: 0,
    installsD7: 0, proceedsD7: 0, eligibleD7: 0, retainedD7: 0,
    installsD14: 0, proceedsD14: 0, eligibleD14: 0, retainedD14: 0,
    installsD30: 0, proceedsD30: 0, eligibleD30: 0, retainedD30: 0,
  };
  const experiment = { id: "versy-scroll-the-bible-v1", title: "Bible Scroll", subtitle: "",
    scoreMetrics: [], showSessions: true, sessionsLabel: "Avg sessions / day", variants: [variant] };
  const render = (available: boolean, sessions: number, days: number) => renderToStaticMarkup(createElement(AppExperimentCard, {
    experiment: { ...experiment, sessionsAvailable: available, variants: [{ ...variant, sessions, sessionUserDays: days }] },
  }));
  assert.match(render(true, 5, 4), /Avg sessions \/ day/);
  assert.match(render(true, 5, 4), />1\.25<\/td>/);
  assert.match(render(true, 0, 4), />0\.00<\/td>/);
  assert.match(render(false, 0, 4), />—<\/td>/);
  assert.match(render(true, 0, 0), />—<\/td>/);
});
