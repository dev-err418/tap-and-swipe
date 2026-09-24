import type { MobileAppCountryRow } from "./mobile-app-analytics";
import { isMobileMoneyEvent } from "./mobile-app-money";

type Install = { appUserId: string; country: string; installedAt: number };
type Outcome = {
  appUserId: string; originalTransactionId: string; name: string; periodType: string;
  isTrialConversion: boolean; eventTs: number; netProceeds: number | null;
};

/** Selected installs and their outcomes through now, grouped by install country. */
export function installCohortCountries(facts: {
  startMs: number; endMs: number; installs: Install[]; events: Outcome[];
}, asOf = Date.now()): MobileAppCountryRow[] {
  const installs = new Map<string, Install>();
  for (const row of facts.installs) {
    if (!row.appUserId || !Number.isFinite(row.installedAt)
      || row.installedAt < facts.startMs || row.installedAt >= facts.endMs) continue;
    const previous = installs.get(row.appUserId);
    if (!previous || row.installedAt < previous.installedAt) installs.set(row.appUserId, row);
  }
  const result = new Map<string, MobileAppCountryRow>();
  for (const row of installs.values()) {
    const point = result.get(row.country) ?? {
      country: row.country, installs: 0, proceeds: 0, trials: 0, converted: 0, paid: 0,
    };
    point.installs++;
    result.set(row.country, point);
  }
  const seenTrial = new Set<string>();
  const seenConverted = new Set<string>();
  const seenPaid = new Set<string>();
  for (const event of facts.events) {
    const install = installs.get(event.appUserId);
    if (!install || !Number.isFinite(event.eventTs)
      || event.eventTs < install.installedAt || event.eventTs > asOf) continue;
    const point = result.get(install.country)!;
    if (event.name === "initial_purchase" && event.periodType === "trial" && !seenTrial.has(event.appUserId)) {
      seenTrial.add(event.appUserId);
      point.trials++;
    }
    if (event.netProceeds == null || !Number.isFinite(event.netProceeds) || !isMobileMoneyEvent(event)) continue;
    point.proceeds += event.netProceeds;
    if (event.netProceeds > 0) {
      if (!seenPaid.has(event.appUserId)) { seenPaid.add(event.appUserId); point.paid++; }
      if (event.isTrialConversion && !seenConverted.has(event.appUserId)) {
        seenConverted.add(event.appUserId);
        point.converted++;
      }
    }
  }
  return [...result.values()].map((row) => ({ ...row, proceeds: Math.round(row.proceeds * 100) / 100 }))
    .sort((a, b) => b.installs - a.installs || b.proceeds - a.proceeds);
}
