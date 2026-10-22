import {
  ASSIGNED_KEY,
  buildUserJourney,
  journeyVersion,
  unsupportedUserJourney,
  userJourneyDefinition,
  type UserJourneyDefinition,
  type UserJourneyReport,
  type UserJourneyStep,
} from "./user-journey";
import { versionParts } from "./app-version";
import { installVersionAtLeast, installVersionPredicateSql } from "./app-experiment-cohort";
import { marketCountry } from "./analytics-markets";

type Query = <T>(sql: string) => Promise<T[]>;

const quote = (value: string) => `'${value.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}'`;

type PaywallRule = {
  variant: string;
  attribute: string;
  suffix?: string;
  key?: string;
  values?: string[];
};

function paywallRules(definition: UserJourneyDefinition): PaywallRule[] {
  return definition.variants.flatMap((variant) => variant.steps.flatMap<PaywallRule>((step) => {
    if (step.attributeSuffix) {
      return [{ variant: variant.key, attribute: step.attribute, suffix: step.attributeSuffix }];
    }
    if (step.attributeKey && step.attributeValues?.length) {
      return [{ variant: variant.key, attribute: step.attribute, key: step.attributeKey, values: step.attributeValues }];
    }
    return [];
  }));
}

function screenAttributes(steps: UserJourneyStep[]) {
  return steps.filter((step) => !step.attributeSuffix && !step.attributeKey).map((step) => step.attribute);
}

export function userJourneySql(
  applicationId: number,
  definition: UserJourneyDefinition,
  start: string,
  end: string,
  byVersion = false,
  byCountry = false,
) {
  const variantAttribute = definition.variantAttribute;
  const variantValues = definition.variants.map((variant) => variant.key);
  const screens = [...new Set(definition.variants.flatMap((variant) => screenAttributes(variant.steps)))];
  const rules = paywallRules(definition);
  if (!Number.isInteger(applicationId) || applicationId <= 0) throw new Error("Invalid application id");
  if (!/^[\d:.\- ]+$/.test(start) || !/^[\d:.\- ]+$/.test(end)) throw new Error("Invalid journey window");
  const variants = variantValues.map(quote).join(", ");
  const cohortAttributes = Object.entries(definition.cohortAttributes ?? {});
  const trackingCohortJoin = cohortAttributes.length ? `
    INNER JOIN (
      SELECT appUserId
      FROM sw.user_attributes_rep FINAL
      WHERE applicationId = ${applicationId}
        AND isSandbox = 0
        AND isDeleted = 0
        AND ts < now()
        AND key IN (${cohortAttributes.map(([key]) => quote(key)).join(", ")})
      GROUP BY appUserId
      HAVING ${cohortAttributes.map(([key, value]) => `countIf(key = ${quote(key)} AND value = ${quote(value)}) > 0`).join(" AND ")}
    ) AS tracked ON tracked.appUserId = assigned.appUserId` : "";
  const screenList = screens.map(quote).join(", ");
  const suffixRules = rules.filter((rule) => rule.suffix);
  const valueRules = rules.filter((rule) => rule.key && rule.values?.length);
  const seenFilters = [
    screenList ? `(key IN (${screenList}) AND value IN ('true', '1', 'True'))` : "",
    suffixRules.length
      ? `(startsWith(key, 'gp1_p_') AND (${suffixRules.map((rule) => `endsWith(key, ${quote(rule.suffix!)})`).join(" OR ")}))`
      : "",
    ...valueRules.map((rule) => `(key = ${quote(rule.key!)} AND value IN (${rule.values!.map(quote).join(", ")}))`),
  ].filter(Boolean);
  const stepFlags = [
    `'${ASSIGNED_KEY}'`,
    ...screens.map((attribute) => `if(countIf(seen.key = ${quote(attribute)}) > 0, ${quote(attribute)}, '')`),
    ...suffixRules.map((rule) =>
      `if(cohort.variant = ${quote(rule.variant)} AND countIf(startsWith(seen.key, 'gp1_p_') AND endsWith(seen.key, ${quote(rule.suffix!)})) > 0, ${quote(rule.attribute)}, '')`),
    ...valueRules.map((rule) =>
      `if(cohort.variant = ${quote(rule.variant)} AND countIf(seen.key = ${quote(rule.key!)} AND seen.value IN (${rule.values!.map(quote).join(", ")})) > 0, ${quote(rule.attribute)}, '')`),
  ];
  const minimumVersion = definition.minimumInstallVersion
    ? versionParts(definition.minimumInstallVersion)
    : null;
  if (definition.minimumInstallVersion && (!minimumVersion || minimumVersion.length > 3)) {
    throw new Error("Invalid minimum install version");
  }
  const installVersionFilter = minimumVersion
    ? `HAVING ${installVersionPredicateSql("version", definition.minimumInstallVersion!)}`
    : "";
  return `
SELECT variant, ${byVersion ? "version, " : ""}${byCountry ? "country, " : ""}step AS key, uniq(appUserId) AS users
FROM (
  SELECT
    cohort.appUserId AS appUserId,
    cohort.variant AS variant,
    ${byVersion ? "cohort.version AS version," : ""}
    ${byCountry ? "cohort.country AS country," : ""}
    arrayJoin(arrayFilter(x -> x != '', [${stepFlags.join(", ")}])) AS step
  FROM (
    SELECT assigned.appUserId AS appUserId, assigned.variant AS variant${byVersion ? ", installs.version AS version" : ""}${byCountry ? ", installs.country AS country" : ""}
    FROM (
      SELECT appUserId, any(value) AS variant
      FROM sw.user_attributes_rep FINAL
      WHERE applicationId = ${applicationId}
        AND isSandbox = 0
        AND isDeleted = 0
        AND ts < now()
        AND key = ${quote(variantAttribute)}
        AND value IN (${variants})
      GROUP BY appUserId
    ) AS assigned
    INNER JOIN (
      SELECT appUserId,
        argMin(JSONExtractString(meta, 'appVersion'), ts) AS version,
        ${byCountry ? "argMin(upper(ifNull(nullIf(JSONExtractString(headers, 'Cf-Ipcountry'), ''), 'unknown')), ts) AS country," : ""}
        argMin(appInstallDate, ts) AS firstInstallDate
      FROM sw.demand_score_events_rep
      WHERE applicationId = ${applicationId}
        AND isSandbox = 0
        AND name = 'device_attributes'
        AND ts < now()
      GROUP BY appUserId
      HAVING firstInstallDate >= toDateTime64('${start}', 6, 'UTC')
        AND firstInstallDate < toDateTime64('${end}', 6, 'UTC')
        ${installVersionFilter ? `AND ${installVersionFilter.replace(/^HAVING /, "")}` : ""}
    ) AS installs ON installs.appUserId = assigned.appUserId${trackingCohortJoin}
  ) AS cohort
  LEFT JOIN (
    SELECT appUserId, key, value
    FROM sw.user_attributes_rep FINAL
    WHERE applicationId = ${applicationId}
      AND isSandbox = 0
      AND isDeleted = 0
      AND ts < now()
      AND (${seenFilters.join(" OR ") || "0"})
  ) AS seen ON seen.appUserId = cohort.appUserId
  GROUP BY cohort.appUserId, cohort.variant${byVersion ? ", cohort.version" : ""}${byCountry ? ", cohort.country" : ""}
)
GROUP BY variant, step${byVersion ? ", version" : ""}${byCountry ? ", country" : ""}
FORMAT JSON
`.trim();
}

export async function loadUserJourney(
  query: Query,
  appId: "glow" | "poky" | "versy",
  applicationId: number,
  start: string,
  end: string,
  minimumInstallVersion?: string,
  includeCountries = false,
): Promise<UserJourneyReport & { countries?: Record<string, UserJourneyReport> }> {
  const original = userJourneyDefinition(appId);
  if (!original) return unsupportedUserJourney(appId);
  const definition = minimumInstallVersion ? { ...original, minimumInstallVersion: original.minimumInstallVersion
    && installVersionAtLeast(original.minimumInstallVersion, minimumInstallVersion) ? original.minimumInstallVersion : minimumInstallVersion } : original;
  try {
    const rows = await query<{ variant: string; version?: string; country?: string; key: string; users: string | number }>(
      userJourneySql(applicationId, definition, start, end, true, includeCountries),
    );
    // Version groups are disjoint: sum counts to preserve the existing all-version view.
    const totals = new Map<string, { variant: string; key: string; users: number }>();
    const groups = new Map<string, { variant: string; key: string; users: number }[]>();
    const countryGroups = new Map<string, Map<string, { variant: string; key: string; users: number }>>();
    for (const row of rows) {
      const users = Number(row.users);
      if (!Number.isSafeInteger(users) || users < 0) throw new Error("Invalid journey count");
      const key = `${row.variant}:${row.key}`;
      const previous = totals.get(key);
      totals.set(key, { variant: row.variant, key: row.key, users: (previous?.users ?? 0) + users });
      if (includeCountries) {
        const country = marketCountry(row.country ?? "");
        const countryTotals = countryGroups.get(country) ?? new Map();
        countryTotals.set(key, { variant: row.variant, key: row.key, users: (countryTotals.get(key)?.users ?? 0) + users });
        countryGroups.set(country, countryTotals);
      }
      const version = journeyVersion(row.version ?? "");
      const group = groups.get(version) ?? [];
      // Malformed metadata can normalize into the same unknown group.
      const existing = group.find((entry) => entry.variant === row.variant && entry.key === row.key);
      if (existing) existing.users += users;
      else group.push({ variant: row.variant, key: row.key, users });
      groups.set(version, group);
    }
    return { ...buildUserJourney(definition, [...totals.values()]),
      ...(includeCountries ? { countries: Object.fromEntries([...countryGroups].map(([country, totals]) =>
        [country, buildUserJourney(definition, [...totals.values()])])) } : {}),
      versions: [...groups].map(([version, group]) => {
      const report = buildUserJourney(definition, group);
      const tracked = report.variants.reduce((sum, variant) => sum + variant.assigned, 0);
      return { version, installs: tracked, tracked, variants: report.variants };
    }) };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("tap_and_swipe.user_journey_failed", error instanceof Error ? error.message : error);
    }
    return {
      status: "unavailable",
      title: definition.title,
      variants: [],
      note: "User journey reporting is unavailable. Refresh to retry.",
    };
  }
}
