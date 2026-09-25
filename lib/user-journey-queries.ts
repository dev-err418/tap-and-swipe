import {
  ASSIGNED_KEY,
  buildUserJourney,
  unsupportedUserJourney,
  userJourneyDefinition,
  type UserJourneyDefinition,
  type UserJourneyReport,
  type UserJourneyStep,
} from "./user-journey";

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
  return definition.variants.flatMap((variant) => variant.steps.flatMap((step) => {
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
) {
  const variantAttribute = definition.variantAttribute;
  const variantValues = definition.variants.map((variant) => variant.key);
  const screens = [...new Set(definition.variants.flatMap((variant) => screenAttributes(variant.steps)))];
  const rules = paywallRules(definition);
  if (!Number.isInteger(applicationId) || applicationId <= 0) throw new Error("Invalid application id");
  if (!/^[\d:.\- ]+$/.test(start) || !/^[\d:.\- ]+$/.test(end)) throw new Error("Invalid journey window");
  const variants = variantValues.map(quote).join(", ");
  const screenList = screens.map(quote).join(", ");
  const assignedFrom = `
    SELECT appUserId, any(value) AS variant
    FROM sw.user_attributes_rep FINAL
    WHERE applicationId = ${applicationId}
      AND isSandbox = 0
      AND isDeleted = 0
      AND ts < now()
      AND key = ${quote(variantAttribute)}
      AND value IN (${variants})
    GROUP BY appUserId
  `;
  const installsFrom = `
    SELECT appUserId
    FROM sw.demand_score_events_rep
    WHERE applicationId = ${applicationId}
      AND isSandbox = 0
      AND name = 'device_attributes'
      AND appInstallDate >= toDateTime64('${start}', 6, 'UTC')
      AND appInstallDate < toDateTime64('${end}', 6, 'UTC')
      AND ts >= toDateTime64('${start}', 6, 'UTC')
      AND ts < now()
    GROUP BY appUserId
  `;
  const suffixRules = rules.filter((rule) => rule.suffix);
  const valueRules = rules.filter((rule) => rule.key && rule.values?.length);
  const suffixUnion = suffixRules.length === 0 ? "" : `
  UNION ALL
  SELECT assigned.appUserId, assigned.variant, reached.attribute AS key
  FROM (${assignedFrom}) AS assigned
  INNER JOIN (${installsFrom}) AS installs ON installs.appUserId = assigned.appUserId
  INNER JOIN (
    SELECT appUserId, key, multiIf(
      ${suffixRules.map((rule) => `endsWith(key, ${quote(rule.suffix!)}) , ${quote(rule.attribute)}`).join(",\n      ")},
      ''
    ) AS attribute
    FROM sw.user_attributes_rep FINAL
    WHERE applicationId = ${applicationId}
      AND isSandbox = 0
      AND isDeleted = 0
      AND ts < now()
      AND startsWith(key, 'gp1_p_')
      AND (${suffixRules.map((rule) => `endsWith(key, ${quote(rule.suffix!)})`).join(" OR ")})
  ) AS reached ON reached.appUserId = assigned.appUserId
  WHERE ${suffixRules.map((rule) => `(assigned.variant = ${quote(rule.variant)} AND endsWith(reached.key, ${quote(rule.suffix!)}))`).join(" OR ")}
  `;
  const valueUnion = valueRules.map((rule) => `
  UNION ALL
  SELECT assigned.appUserId, assigned.variant, ${quote(rule.attribute)} AS key
  FROM (${assignedFrom}) AS assigned
  INNER JOIN (${installsFrom}) AS installs ON installs.appUserId = assigned.appUserId
  INNER JOIN (
    SELECT appUserId
    FROM sw.user_attributes_rep FINAL
    WHERE applicationId = ${applicationId}
      AND isSandbox = 0
      AND isDeleted = 0
      AND ts < now()
      AND key = ${quote(rule.key!)}
      AND value IN (${rule.values!.map(quote).join(", ")})
  ) AS reached ON reached.appUserId = assigned.appUserId
  WHERE assigned.variant = ${quote(rule.variant)}
  `).join("");
  const screenUnion = screenList.length === 0 ? "" : `
  UNION ALL
  SELECT assigned.appUserId, assigned.variant, seen.key
  FROM (${assignedFrom}) AS assigned
  INNER JOIN (${installsFrom}) AS installs ON installs.appUserId = assigned.appUserId
  INNER JOIN (
    SELECT appUserId, key
    FROM sw.user_attributes_rep FINAL
    WHERE applicationId = ${applicationId}
      AND isSandbox = 0
      AND isDeleted = 0
      AND ts < now()
      AND value IN ('true', '1', 'True')
      AND key IN (${screenList})
  ) AS seen ON seen.appUserId = assigned.appUserId
  `;
  return `
SELECT variant, key, uniq(appUserId) AS users
FROM (
  SELECT assigned.appUserId AS appUserId, assigned.variant AS variant, '${ASSIGNED_KEY}' AS key
  FROM (${assignedFrom}) AS assigned
  INNER JOIN (${installsFrom}) AS installs ON installs.appUserId = assigned.appUserId
  ${screenUnion}
  ${suffixUnion}
  ${valueUnion}
)
GROUP BY variant, key
FORMAT JSON
`.trim();
}

export async function loadUserJourney(
  query: Query,
  appId: "glow" | "poky" | "versy",
  applicationId: number,
  start: string,
  end: string,
): Promise<UserJourneyReport> {
  const definition = userJourneyDefinition(appId);
  if (!definition) return unsupportedUserJourney(appId);
  try {
    const rows = await query<{ variant: string; key: string; users: string | number }>(
      userJourneySql(applicationId, definition, start, end),
    );
    return buildUserJourney(definition, rows.map((row) => ({
      variant: row.variant,
      key: row.key,
      users: Number(row.users),
    })));
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
