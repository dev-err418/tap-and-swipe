import { GLOW_PAYWALL_FLOW_ID, GLOW_PAYWALL_FLOW_KEY, onboardingCohort } from "./glow-onboarding-experience";
import { GLOW_YEARLY_PRICE_EXPERIMENT, GLOW_YEARLY_PRICES } from "./native-paywall-allocation";
import { parsePaywallAttributes, type PaywallAttribute } from "./native-paywall-analytics";
import { emptyVersionConversions, versionCohortConversions } from "./version-cohort-conversions";
import type { JourneyVersionCohort } from "./user-journey";

const PRICE_KEY = `gp1_a_${GLOW_YEARLY_PRICE_EXPERIMENT.id}`;
export const GLOW_PAYWALL_COHORT_KEYS = [GLOW_PAYWALL_FLOW_KEY, PRICE_KEY];
export type PaywallCohortComparison = {
  status: "ready" | "empty" | "unavailable";
  rows: JourneyVersionCohort[];
  labels: Record<string, string>;
  warnings: string[];
};
export type GlowPaywallCohortComparisons = { flows: PaywallCohortComparison; prices: PaywallCohortComparison; flowPrices: PaywallCohortComparison };
type Assignment = { variant: string; assignedAt: number };
type Install = Parameters<typeof versionCohortConversions>[0][number];

/** Install-window comparisons; saved experimental assignments determine membership, never purchases. */
export function buildGlowPaywallCohortComparisons(
  installs: Install[],
  events: Parameters<typeof versionCohortConversions>[1],
  attributes: Map<string, Record<string, string>>,
  startMs: number,
  endMs: number,
  asOf = Date.now(),
): GlowPaywallCohortComparisons {
  const first = new Map<string, Install>();
  for (const install of installs) {
    const previous = first.get(install.appUserId);
    if (install.appUserId && Number.isFinite(install.installedAt) && (!previous || install.installedAt < previous.installedAt)) first.set(install.appUserId, install);
  }
  const selected = [...first.values()].filter((row) => row.installedAt >= startMs && row.installedAt < endMs && row.installedAt <= asOf);
  const records: PaywallAttribute[] = selected.flatMap(({ appUserId }) => GLOW_PAYWALL_COHORT_KEYS.flatMap((key) => {
    const value = attributes.get(appUserId)?.[key];
    return value === undefined ? [] : [{ appUserId, key, value }];
  }));
  // Filter by install dates above, then validate assignments independently of the date picker.
  const flows = onboardingCohort(records, 0, asOf + 1, asOf, GLOW_PAYWALL_FLOW_ID);
  const parsedPrices = parsePaywallAttributes(records.filter((row) => row.key === PRICE_KEY));
  const prices = new Map<string, Assignment>();
  for (const { appUserId } of selected) {
    const record = parsedPrices.assignments.get(`${appUserId}|${GLOW_YEARLY_PRICE_EXPERIMENT.id}`);
    if (!record || !record.randomized || record.variantCount !== 3 || record.hadFallback
      || record.assignedAt > asOf || (record.viewedAt != null && record.viewedAt > asOf)
      || record.variant !== record.paywall || !GLOW_YEARLY_PRICES.some(({ id }) => id === record.variant)) continue;
    prices.set(appUserId, record);
  }
  const compare = (assignments: Map<string, Assignment>, labels: Record<string, string>, warnings: string[]): PaywallCohortComparison => {
    const rows = Object.keys(labels).map((variant): JourneyVersionCohort => {
      const members = selected.filter((install) => {
        const assignment = assignments.get(install.appUserId);
        // Startup assignment can precede the SDK's install timestamp by milliseconds.
        // Membership follows the saved assignment; outcome cutoffs still respect both dates.
        return assignment?.variant === variant;
      });
      const outcomeStarts = new Map(members.map((install) => [install.appUserId, assignments.get(install.appUserId)!.assignedAt]));
      const conversions = versionCohortConversions(members.map((install) => ({ ...install, appVersion: "0" })),
        events, attributes, startMs, endMs, asOf, outcomeStarts).get("0") ?? emptyVersionConversions();
      return { version: variant, installs: conversions.global.installs, tracked: conversions.global.installs, variants: [], conversions };
    });
    return { status: rows.some((row) => row.installs > 0) ? "ready" : "empty", rows, labels, warnings };
  };
  const flowLabels = { standard: "Current flow", versy_reminder: "Versy reminder flow" };
  const priceWarnings = parsedPrices.invalid ? [`${parsedPrices.invalid} invalid price assignments were excluded.`] : [];
  const flowPrices = new Map<string, Assignment>();
  for (const [user, flow] of flows.records) {
    const price = prices.get(user);
    if (!price) continue;
    flowPrices.set(user, { variant: `${flow.variant}|${price.variant}`, assignedAt: Math.max(flow.assignedAt, price.assignedAt) });
  }
  return {
    flows: compare(flows.records, flowLabels, flows.warnings),
    prices: compare(prices, Object.fromEntries(GLOW_YEARLY_PRICES.map(({ id, price }) => [id, price])),
      priceWarnings),
    flowPrices: compare(flowPrices, Object.fromEntries(Object.entries(flowLabels).flatMap(([flow, label]) =>
      GLOW_YEARLY_PRICES.map(({ id, price }) => [`${flow}|${id}`, `${label} · ${price}`]))), [...flows.warnings, ...priceWarnings]),
  };
}
