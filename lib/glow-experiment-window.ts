export const GLOW_EXPERIMENT_START_MS = Date.parse("2026-09-20T06:00:00.000Z");

export function glowExperimentStart(startMs: number) {
  return Math.max(startMs, GLOW_EXPERIMENT_START_MS);
}
