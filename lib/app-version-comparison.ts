/** App versions are compared by numeric components, never lexicographically. */
export function versionParts(value: string): number[] | null {
  if (value.length > 40 || !/^\d+(?:\.\d+){0,3}$/.test(value)) return null;
  const parts = value.split(".").map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
}

export function compareAppVersions(left: string, right: string): number | null {
  const a = versionParts(left);
  const b = versionParts(right);
  if (!a || !b) return null;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

export function appVersionSide(installedVersion: string, cutoff: string): "before" | "after" | null {
  const order = compareAppVersions(installedVersion, cutoff);
  return order == null ? null : order < 0 ? "before" : "after";
}

export function availableAppVersions(versions: Iterable<string>): string[] {
  return [...new Set([...versions].filter((version) => versionParts(version) !== null))]
    .sort((a, b) => compareAppVersions(b, a) ?? 0);
}
