import { experimentInstallCohort, EXPERIMENT_MINIMUM_INSTALL_VERSION } from "./app-experiment-cohort";
import { emptyVersionConversions, versionCohortConversions } from "./version-cohort-conversions";
import { isVersyScrollRoute } from "./versy-onboarding-routes";
import type { PaywallCohortComparison } from "./glow-paywall-cohort-comparisons";

export const VERSY_SCROLL_ACCESS_EXPERIMENT = "versy_scroll_paywall_access_v1";
export const VERSY_SCROLL_ACCESS_ATTRIBUTE = `vs1_${VERSY_SCROLL_ACCESS_EXPERIMENT}`;
export const VERSY_SCROLL_ONBOARDING_EXPERIMENT = "scroll_the_bible_v3";
type Assignment = { schema: 1; experiment: string; environment: string; flow: string;
  access: "hard" | "dismissible"; assignedAt: number; yearlyProduct: string };

export function parseVersyScrollAccess(values: Record<string, string> | undefined, asOf: number): Assignment | null {
  if (values?.versy_tracking_environment !== "production"
    || values.onboarding_experiment_id !== VERSY_SCROLL_ONBOARDING_EXPERIMENT) return null;
  try {
    let r = JSON.parse(values[VERSY_SCROLL_ACCESS_ATTRIBUTE]);
    if (typeof r === "string") r = JSON.parse(r);
    if (!r || r.schema !== 1 || r.experiment !== VERSY_SCROLL_ACCESS_EXPERIMENT || r.environment !== "production"
      || !isVersyScrollRoute(r.flow) || r.flow !== values.onboarding_variant
      || !["hard", "dismissible"].includes(r.access) || typeof r.assignedAt !== "number"
      || !Number.isFinite(r.assignedAt) || r.assignedAt <= 0 || r.assignedAt > asOf
      || typeof r.yearlyProduct !== "string" || !r.yearlyProduct) return null;
    return r;
  } catch { return null; }
}

export function buildVersyScrollAccessComparison(
  installs: Parameters<typeof versionCohortConversions>[0],
  events: Parameters<typeof versionCohortConversions>[1],
  attributes: Map<string, Record<string, string>>, asOf: number,
): { overall: PaywallCohortComparison; flows: PaywallCohortComparison } {
  const members = experimentInstallCohort(installs, EXPERIMENT_MINIMUM_INSTALL_VERSION.versy, asOf)
    .flatMap((install) => {
      const record = parseVersyScrollAccess(attributes.get(install.appUserId), asOf);
      return record ? [{ install, record }] : [];
    });
  const compare = (labels: Record<string, string>, byFlow: boolean): PaywallCohortComparison => ({
    status: members.length ? "ready" : "empty", labels, warnings: [],
    rows: Object.keys(labels).map((key) => {
      const selected = members.filter(({ record }) => (byFlow ? `${record.flow}|${record.access}` : record.access) === key);
      const starts = new Map(selected.map(({ install, record }) => [install.appUserId, record.assignedAt]));
      // Supply the immutable offered product to the existing maturity calculation.
      const savedAttributes = new Map(attributes);
      for (const { install, record } of selected) savedAttributes.set(install.appUserId, {
        ...attributes.get(install.appUserId), yearly_price_assigned_at: String(record.assignedAt),
        yearly_price_product_id: record.yearlyProduct,
      });
      const conversions = versionCohortConversions(selected.map(({ install }) => ({ ...install, appVersion: "0" })),
        events, savedAttributes, 0, asOf + 1, asOf, starts).get("0") ?? emptyVersionConversions();
      return { version: key, installs: conversions.global.installs, tracked: conversions.global.installs, variants: [], conversions };
    }),
  });
  const access = { hard: "Hard", dismissible: "Current soft" };
  return {
    overall: compare(access, false),
    flows: compare(Object.fromEntries([
      ["scroll_the_bible", "Current"], ["scroll_the_bible_animations", "Animations"], ["scroll_the_bible_videos", "Videos"],
    ].flatMap(([flow, label]) => Object.entries(access).map(([key, name]) => [`${flow}|${key}`, `${label} · ${name}`]))), true),
  };
}
