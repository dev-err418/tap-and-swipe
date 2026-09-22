import type { MobileAppCountryRow } from "./mobile-app-analytics";
import { isMobileMoneyEvent } from "./mobile-app-money";

const TRIAL_MS = 3 * 86_400_000;
type Install = { appUserId: string; country: string; installedAt: number };
type Outcome = {
  appUserId: string; originalTransactionId: string; transactionId: string;
  name: string; periodType: string; isTrialConversion: boolean;
  eventTs: number; attributionTs: number; netProceeds: number | null;
};

/** Selected install cohorts for the Countries/APPU and CR charts, observed through asOf,
 * including non-payers and cancelled trials after the full 72 hours.
 * A late trial start postpones eligibility; an early purchase never accelerates it.
 */
export function glowMatureCountries(facts: { startMs: number; endMs: number; installs: Install[]; events: Outcome[] }, asOf = Date.now()): MobileAppCountryRow[] {
  const installs = new Map<string, Install>();
  for (const install of facts.installs) {
    if (!install.appUserId || !Number.isFinite(install.installedAt)) continue;
    const previous = installs.get(install.appUserId);
    if (!previous || install.installedAt < previous.installedAt) installs.set(install.appUserId, install);
  }
  for (const [user, install] of installs) {
    if (install.installedAt < facts.startMs || install.installedAt >= facts.endMs || install.installedAt + TRIAL_MS > asOf) installs.delete(user);
  }

  const unique = new Map<string, Outcome>();
  const owners = new Map<string, string>();
  for (const event of facts.events) {
    if (!Number.isFinite(event.eventTs) || event.eventTs > asOf) continue;
    if (event.appUserId && event.originalTransactionId && installs.has(event.appUserId)) owners.set(event.originalTransactionId, event.appUserId);
    // A cancellation can reuse the trial transaction ID without replacing its start.
    const kind = isMobileMoneyEvent(event) ? "money" : event.name;
    const key = `${kind}|${event.originalTransactionId}|${event.transactionId || `${event.name}|${event.eventTs}`}|${(event.netProceeds ?? 0) < 0}`;
    const previous = unique.get(key);
    if (!previous || event.attributionTs > previous.attributionTs) unique.set(key, event);
  }
  const ownerFor = (event: Outcome) => event.appUserId || owners.get(event.originalTransactionId) || "";
  const trialStarts = new Map<string, number>();
  for (const event of unique.values()) {
    const user = ownerFor(event);
    const install = installs.get(user);
    if (!install || event.eventTs < install.installedAt || event.name !== "initial_purchase" || event.periodType !== "trial") continue;
    trialStarts.set(user, Math.max(trialStarts.get(user) ?? -Infinity, event.eventTs));
  }
  for (const [user, startedAt] of trialStarts) if (startedAt + TRIAL_MS > asOf) installs.delete(user);

  const countries = new Map<string, MobileAppCountryRow>();
  for (const [user, install] of installs) {
    const row = countries.get(install.country) ?? { country: install.country, installs: 0, proceeds: 0, trials: 0, converted: 0, paid: 0 };
    row.installs++;
    if (trialStarts.has(user)) row.trials++;
    countries.set(install.country, row);
  }
  const paid = new Set<string>();
  const converted = new Set<string>();
  for (const event of unique.values()) {
    const user = ownerFor(event);
    const install = installs.get(user);
    if (!install || event.eventTs < install.installedAt || event.netProceeds == null || !Number.isFinite(event.netProceeds) || !isMobileMoneyEvent(event)) continue;
    const row = countries.get(install.country)!;
    row.proceeds += event.netProceeds;
    if (event.netProceeds > 0) {
      if (!paid.has(user)) { row.paid++; paid.add(user); }
      if (event.isTrialConversion && trialStarts.has(user) && !converted.has(user)) { row.converted++; converted.add(user); }
    }
  }
  return [...countries.values()].map((row) => ({ ...row, proceeds: Math.round(row.proceeds * 100) / 100 }))
    .sort((a, b) => b.installs - a.installs || b.proceeds - a.proceeds);
}
