import { activeTrialsByAge } from "./active-trials";
import { experimentInstallCohort } from "./app-experiment-cohort";
import { sevenDayTrialSurvival } from "./trial-survival";

type Install = { appUserId: string; installedAt: number; appVersion: string };
type Event = Parameters<typeof activeTrialsByAge>[0][number] & { appUserId: string };

/** Follow subscriptions started by the first-install version cohort through report time. */
export function installCohortTrialSurvival(installs: Install[], events: Event[], minimumVersion: string, asOf = Date.now()) {
  const members = new Map(experimentInstallCohort(installs, minimumVersion, asOf).map((install) => [install.appUserId, install]));
  const observed = events.filter((event) => Number.isFinite(event.eventTs) && event.eventTs <= asOf);
  const owners = new Map<string, { user: string; at: number }>();
  for (const event of observed) {
    if (event.name !== "initial_purchase" || event.isRefund || !event.originalTransactionId || !event.appUserId) continue;
    const owner = owners.get(event.originalTransactionId);
    if (!owner || event.eventTs < owner.at) owners.set(event.originalTransactionId, { user: event.appUserId, at: event.eventTs });
  }
  const cohortEvents = observed.filter((event) => {
    const owner = owners.get(event.originalTransactionId);
    if (!owner) return false;
    const install = members.get(owner.user);
    // Subscription ownership also retains cancellations with a missing user ID.
    return install && owner.at >= install.installedAt && event.eventTs >= owner.at;
  });
  return {
    ...sevenDayTrialSurvival(cohortEvents, 0, asOf + 1, asOf),
    activeTrials: activeTrialsByAge(cohortEvents, 0, asOf + 1, asOf),
  };
}
