export const POKY_EXPERIMENT_START_MS = Date.parse("2026-09-20T14:00:00.000Z");

export function pokyExperimentStart(startMs: number) {
  return Math.max(startMs, POKY_EXPERIMENT_START_MS);
}
