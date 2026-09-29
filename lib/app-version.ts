/** Parse an install version for minimum-version journey filters. */
export function versionParts(value: string): number[] | null {
  if (value.length > 40 || !/^\d+(?:\.\d+){0,3}$/.test(value)) return null;
  const parts = value.split(".").map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
}
