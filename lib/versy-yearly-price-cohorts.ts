import { experimentInstallCohort, EXPERIMENT_MINIMUM_INSTALL_VERSION } from "./app-experiment-cohort";
import { emptyVersionConversions, versionCohortConversions } from "./version-cohort-conversions";
import type { PaywallCohortComparison } from "./glow-paywall-cohort-comparisons";

export const VERSY_YEARLY_PRICE_EXPERIMENT = "versy_yearly_price_v3";
export const VERSY_RETIRED_YEARLY_PRICE_EXPERIMENT = "versy_yearly_price_v4";
export const VERSY_YEARLY_PRICES = [
  { key: "yearly_3999_80", label: "$39.99 (7d)", productID: "com.arthurbuildsstuff.bible.yearly_3999_80" },
  { key: "yearly_4999", label: "$49.99 (7d)", productID: "com.arthurbuildsstuff.bible.yearly_4999" },
] as const;

export function isVersyYearlyPriceAssignment(values: Record<string, string> | undefined): boolean {
  if (values?.versy_tracking_environment !== "production") return false;
  const retired = values.yearly_price_experiment_id === VERSY_RETIRED_YEARLY_PRICE_EXPERIMENT;
  // Retain matching seven-day history; retired three-day assignments never enter these rows.
  return (retired || values.yearly_price_experiment_id === VERSY_YEARLY_PRICE_EXPERIMENT)
    && values.yearly_price_allocation === (retired ? "25_25_25_25" : "50_50")
    && VERSY_YEARLY_PRICES.some((price) => price.productID === values.yearly_price_product_id);
}
export const VERSY_YEARLY_PRICE_ATTRIBUTE_KEYS = [
  "yearly_price_experiment_id", "yearly_price_product_id", "yearly_price_allocation", "yearly_price_assigned_at",
] as const;

/** Saved fresh price assignments, never the purchased product, determine cohort membership. */
export function buildVersyYearlyPriceComparison(
  installs: Parameters<typeof versionCohortConversions>[0],
  events: Parameters<typeof versionCohortConversions>[1],
  attributes: Map<string, Record<string, string>>,
  asOf = Date.now(),
): PaywallCohortComparison {
  const eligible = experimentInstallCohort(installs, EXPERIMENT_MINIMUM_INSTALL_VERSION.versy, asOf);
  let invalidTimes = 0;
  const enrolled = eligible.flatMap((install) => {
    const values = attributes.get(install.appUserId);
    if (!values || !isVersyYearlyPriceAssignment(values)) return [];
    const assignedAt = Number(values.yearly_price_assigned_at);
    if (!Number.isFinite(assignedAt) || assignedAt <= 0 || assignedAt > asOf) { invalidTimes++; return []; }
    return [{ install, assignedAt, productID: values.yearly_price_product_id }];
  });
  const rows = VERSY_YEARLY_PRICES.map((price) => {
    const members = enrolled.filter((row) => row.productID === price.productID);
    const conversions = versionCohortConversions(members.map(({ install }) => ({ ...install, appVersion: "0" })),
      events, attributes, 0, asOf + 1, asOf, new Map(members.map(({ install, assignedAt }) => [install.appUserId, assignedAt]))).get("0")
      ?? emptyVersionConversions();
    return { version: price.key, installs: conversions.global.installs, tracked: conversions.global.installs, variants: [], conversions };
  });
  return {
    status: rows.some((row) => row.installs > 0) ? "ready" : "empty", rows,
    labels: Object.fromEntries(VERSY_YEARLY_PRICES.map((price) => [price.key, price.label.replace(" (", "/year (")])),
    warnings: invalidTimes ? [`${invalidTimes} price assignments have an invalid or missing assignment time and were excluded.`] : [],
  };
}
