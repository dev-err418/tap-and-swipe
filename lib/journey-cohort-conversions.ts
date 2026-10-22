import { versionParts } from "./app-version";
import { userJourneyDefinition, type UserJourneyReport } from "./user-journey";
import { emptyVersionConversions, versionCohortConversions } from "./version-cohort-conversions";

export function journeyCohortAttributeKeys(appId: "glow" | "poky" | "versy") {
  const definition = userJourneyDefinition(appId);
  return definition ? [definition.variantAttribute, ...Object.keys(definition.cohortAttributes ?? {})] : [];
}

/** Match the screen funnel's enrolled install cohort; follow its verified outcomes through now. */
export function withJourneyConversions(
  report: UserJourneyReport,
  appId: "glow" | "poky" | "versy",
  installs: Parameters<typeof versionCohortConversions>[0],
  events: Parameters<typeof versionCohortConversions>[1],
  attributes: Map<string, Record<string, string>>,
  startMs: number,
  endMs: number,
  asOf = Date.now(),
): UserJourneyReport {
  const definition = userJourneyDefinition(appId);
  if (!definition || (report.status !== "ready" && report.status !== "empty")) return report;
  const first = new Map<string, (typeof installs)[number]>();
  for (const install of installs) {
    const previous = first.get(install.appUserId);
    if (install.appUserId && Number.isFinite(install.installedAt) && (!previous || install.installedAt < previous.installedAt)) {
      first.set(install.appUserId, install);
    }
  }
  const minimum = definition.minimumInstallVersion ? versionParts(definition.minimumInstallVersion) : null;
  const enrolled = [...first.values()].filter((install) => {
    const values = attributes.get(install.appUserId);
    if (!Object.entries(definition.cohortAttributes ?? {}).every(([key, value]) => values?.[key] === value)) return false;
    if (minimum) {
      const parts = versionParts(install.appVersion);
      if (!parts) return false;
      for (let i = 0; i < Math.max(parts.length, minimum.length); i++) {
        const difference = (parts[i] ?? 0) - (minimum[i] ?? 0);
        if (difference !== 0) return difference > 0;
      }
    }
    return true;
  });
  return { ...report, variants: report.variants.map((variant) => {
    const members = enrolled.filter((install) => attributes.get(install.appUserId)?.[definition.variantAttribute] === variant.key);
    // Collapse versions only inside this route, keeping install dates and identities intact.
    const conversions = versionCohortConversions(members.map((install) => ({ ...install, appVersion: "0" })),
      events, attributes, startMs, endMs, asOf).get("0") ?? emptyVersionConversions();
    return { ...variant, conversions };
  }) };
}
