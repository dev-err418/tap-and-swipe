type CohortFacts = {
  startMs: number;
  endMs: number;
  installs: { appUserId: string; installedAt: number }[];
  events: { appUserId: string; eventTs: number; name: string; netProceeds: number | null }[];
  sessions: { appUserId: string }[];
};

/** Paying install cohort, including past payers; this is not a current-entitlement check. */
export function paidExperienceCohort<T extends CohortFacts>(facts: T, asOf = Date.now()): T {
  const installed = new Map(facts.installs
    .filter((row) => row.installedAt >= facts.startMs && row.installedAt < facts.endMs && row.installedAt <= asOf)
    .map((row) => [row.appUserId, row.installedAt]));
  const paid = new Set(facts.events.filter((event) => {
    const at = installed.get(event.appUserId);
    return at != null && event.eventTs >= at && event.eventTs <= asOf
      && ["initial_purchase", "renewal", "non_renewing_purchase"].includes(event.name)
      && event.netProceeds != null && Number.isFinite(event.netProceeds) && event.netProceeds > 0;
  }).map((event) => event.appUserId));
  return { ...facts,
    installs: facts.installs.filter((row) => paid.has(row.appUserId)),
    sessions: facts.sessions.filter((row) => paid.has(row.appUserId)),
    events: facts.events.filter((row) => paid.has(row.appUserId)),
  };
}
