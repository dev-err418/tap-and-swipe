import { createOfferAccumulator, hasVersyProducts, offerProductResolver } from "./versy-offer-breakdown";
import type { MobileAppCountryRow } from "./mobile-app-analytics";
import { isMobileMoneyEvent } from "./mobile-app-money";
import { emptyRealizedAppu, isVersyAppu, mergeRealizedAppu, realizedAppuByUser, versyMember } from "./realized-appu";

type Install = { appUserId: string; country: string; installedAt: number };
type Outcome = {
  productId?: string; transactionId?: string; isRefund?: boolean; expiresAt?: number; attributionTs?: number;
  appUserId: string; originalTransactionId: string; name: string; periodType: string;
  isTrialConversion: boolean; eventTs: number; netProceeds: number | null;
};

/** Selected installs and their outcomes through now, grouped by install country. */
export function installCohortCountries(facts: {
  startMs: number; endMs: number; installs: Install[]; events: Outcome[];
  attributes?: Map<string, Record<string, string>>;
}, asOf = Date.now()): MobileAppCountryRow[] {
  const installs = new Map<string, Install>();
  for (const row of facts.installs) {
    if (!row.appUserId || !Number.isFinite(row.installedAt)
      || row.installedAt < facts.startMs || row.installedAt >= facts.endMs) continue;
    const previous = installs.get(row.appUserId);
    if (!previous || row.installedAt < previous.installedAt) installs.set(row.appUserId, row);
  }
  const result = new Map<string, MobileAppCountryRow>();
  const realized = isVersyAppu(facts.events, facts.attributes) ? realizedAppuByUser([...installs.values()]
    .map((install) => versyMember(install, facts.attributes?.get(install.appUserId))), facts.events, asOf) : null;
  for (const row of installs.values()) {
    const point = result.get(row.country) ?? {
      country: row.country, installs: 0, proceeds: 0, trials: 0, converted: 0, paid: 0,
    };
    point.installs++;
    if (realized) {
      point.realizedAppu ??= emptyRealizedAppu();
      mergeRealizedAppu(point, { realizedAppu: realized.get(row.appUserId) });
    }
    result.set(row.country, point);
  }
  const addOffer = createOfferAccumulator();
  const trackOffers = hasVersyProducts(facts.events);
  const offerProduct = offerProductResolver(facts.events);
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
    if (trackOffers && (isMobileMoneyEvent(event) || event.isRefund)) addOffer(point, { ...event, productId: offerProduct(event) });
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
