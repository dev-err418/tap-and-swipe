import { versionParts } from "./app-version";

export const EXPERIMENT_MINIMUM_INSTALL_VERSION = { glow: "1.8.3", versy: "1.2.6" } as const;

export function experimentMinimumInstallVersion(appId: string): string | undefined {
  return appId === "glow" || appId === "versy" ? EXPERIMENT_MINIMUM_INSTALL_VERSION[appId] : undefined;
}

export function experimentCohortLabel(appId: string): string | null {
  const version = experimentMinimumInstallVersion(appId);
  return version ? `Installed on v${version}+` : null;
}

export function installVersionAtLeast(version: string, minimum: string): boolean {
  const parts = versionParts(version);
  const floor = versionParts(minimum);
  if (!parts || !floor) return false;
  for (let index = 0; index < Math.max(parts.length, floor.length); index++) {
    const difference = (parts[index] ?? 0) - (floor[index] ?? 0);
    if (difference) return difference > 0;
  }
  return true;
}

/** Freeze the earliest production install before filtering; upgrades never enroll old installs. */
export function experimentInstallCohort<T extends { appUserId: string; installedAt: number; appVersion: string }>(
  installs: T[], minimum: string, asOf = Date.now(),
): T[] {
  const first = new Map<string, T>();
  for (const install of installs) {
    if (!install.appUserId || !Number.isFinite(install.installedAt)) continue;
    const previous = first.get(install.appUserId);
    if (!previous || install.installedAt < previous.installedAt) first.set(install.appUserId, install);
  }
  return [...first.values()].filter((install) => install.installedAt <= asOf && installVersionAtLeast(install.appVersion, minimum));
}

export function installVersionPredicateSql(column: string, minimum: string): string {
  const floor = versionParts(minimum);
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(column) || !floor) throw new Error("Invalid install version filter");
  return `(match(${column}, '^[0-9]+([.][0-9]+){0,3}$') AND length(${column}) <= 40
    AND tuple(${[1, 2, 3, 4].map((part) => `toUInt64OrZero(splitByChar('.', ${column})[${part}])`).join(", ")})
      >= tuple(${[0, 1, 2, 3].map((index) => floor[index] ?? 0).join(", ")}))`;
}

export function experimentInstallUsersSql(applicationId: number, minimum: string): string {
  if (!Number.isInteger(applicationId) || applicationId <= 0) throw new Error("Invalid application id");
  return `SELECT appUserId FROM sw.demand_score_events_rep
    WHERE applicationId = ${applicationId} AND isSandbox = 0 AND name = 'device_attributes' AND ts < now()
    GROUP BY appUserId
    HAVING ${installVersionPredicateSql("firstInstallVersion", minimum).replaceAll("firstInstallVersion", "argMin(JSONExtractString(meta, 'appVersion'), ts)")}
      AND argMin(appInstallDate, ts) < now()`;
}
