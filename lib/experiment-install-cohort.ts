type Install = { appUserId: string; installedAt: number };
type Event = { appUserId: string; eventTs: number };

/** Only outcomes of measured installs can enter an experiment numerator. */
export function matchedCohortInstall<T extends Install>(cohort: ReadonlyMap<string, T>, event: Event, asOf: number): T | null {
  const install = cohort.get(event.appUserId);
  return install && Number.isFinite(event.eventTs)
    && event.eventTs >= install.installedAt && event.eventTs <= asOf ? install : null;
}
