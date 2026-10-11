import { buildAppOverviewCohorts, totalCohortAppu } from "./app-overview-cohorts";

type Facts = Pick<Parameters<typeof buildAppOverviewCohorts>[0], "installs" | "events">;
const DAY = 86_400_000;

/** Compare acquisition cohorts at each window's close, never borrowing older revenue. */
export function buildDailyAppReport(facts: Facts, endMs: number) {
  const window = (end: number) => {
    const total = buildAppOverviewCohorts({
      ...facts, events: facts.events.filter((event) => event.eventTs < end),
      period: "day", startMs: end - DAY, endMs: end, asOf: end,
      downloads: [],
    }).total;
    return { downloads: total.installs, trials: total.trials,
      appu: totalCohortAppu(total),
      trialStartRate: total.installs ? total.trials / total.installs : null };
  };
  return { endMs, currency: "USD" as const, current: window(endMs), previous: window(endMs - DAY) };
}
