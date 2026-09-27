import {
  ASSIGNED_KEY,
  buildUserJourney,
  unsupportedUserJourney,
  userJourneyDefinition,
  type UserJourneyDefinition,
  type UserJourneyReport,
  type UserJourneyStep,
} from "./user-journey";
import { appVersionSide } from "./app-version-comparison";

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
  includeVersions = false,
) {
  const variantAttribute = definition.variantAttribute;
  const variantValues = definition.variants.map((variant) => variant.key);
  const screens = [...new Set(definition.variants.flatMap((variant) => screenAttributes(variant.steps)))];
  const rules = paywallRules(definition);
  if (!Number.isInteger(applicationId) || applicationId <= 0) throw new Error("Invalid application id");
  if (!/^[\d:.\- ]+$/.test(start) || !/^[\d:.\- ]+$/.test(end)) throw new Error("Invalid journey window");
  const variants = variantValues.map(quote).join(", ");
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
  return `
SELECT variant, step AS key, ${includeVersions ? "version," : ""} uniq(appUserId) AS users
FROM (
  SELECT
    cohort.appUserId AS appUserId,
    cohort.variant AS variant,
    ${includeVersions ? "cohort.version AS version," : ""}
    arrayJoin(arrayFilter(x -> x != '', [${stepFlags.join(", ")}])) AS step
  FROM (
    SELECT assigned.appUserId AS appUserId, assigned.variant AS variant${includeVersions ? ", installs.version AS version" : ""}
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
      SELECT appUserId${includeVersions ? ", argMin(JSONExtractString(meta, 'appVersion'), ts) AS version" : ""}
      FROM sw.demand_score_events_rep
      WHERE applicationId = ${applicationId}
        AND isSandbox = 0
        AND name = 'device_attributes'
        AND appInstallDate >= toDateTime64('${start}', 6, 'UTC')
        AND appInstallDate < toDateTime64('${end}', 6, 'UTC')
        AND ts >= toDateTime64('${start}', 6, 'UTC')
        AND ts < now()
      GROUP BY appUserId
    ) AS installs ON installs.appUserId = assigned.appUserId
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
  GROUP BY cohort.appUserId, cohort.variant${includeVersions ? ", cohort.version" : ""}
)
GROUP BY variant, step${includeVersions ? ", version" : ""}
FORMAT JSON
`.trim();
}

export async function loadUserJourney(
  query: Query,
  appId: "glow" | "poky" | "versy",
  applicationId: number,
  start: string,
  end: string,
  compareVersion?: string,
): Promise<UserJourneyReport> {
  const definition = userJourneyDefinition(appId);
  if (!definition) return unsupportedUserJourney(appId);
  try {
    const rows = await query<{ variant: string; key: string; users: string | number; version?: string }>(
      userJourneySql(applicationId, definition, start, end, Boolean(compareVersion)),
    );
    const allRows = rows.map((row) => ({
      variant: row.variant,
      key: row.key,
      users: Number(row.users),
    }));
    if (!compareVersion) return buildUserJourney(definition, allRows);
    const report = buildUserJourney(definition, sumJourneyRows(allRows));
    report.versionComparison = {
      before: buildUserJourney(definition, sumJourneyRows(allRows.filter((_, index) => appVersionSide(rows[index].version ?? "", compareVersion) === "before"))),
      after: buildUserJourney(definition, sumJourneyRows(allRows.filter((_, index) => appVersionSide(rows[index].version ?? "", compareVersion) === "after"))),
    };
    return report;
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

function sumJourneyRows(rows: { variant: string; key: string; users: number }[]) {
  const totals = new Map<string, { variant: string; key: string; users: number }>();
  for (const row of rows) {
    const id = `${row.variant}|${row.key}`;
    const total = totals.get(id) ?? { variant: row.variant, key: row.key, users: 0 };
    total.users += row.users;
    totals.set(id, total);
  }
  return [...totals.values()];
}
