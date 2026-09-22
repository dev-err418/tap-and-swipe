import assert from "node:assert/strict";
import test from "node:test";
import { calculateExperimentReadiness, type ExperimentArm } from "../../lib/experiment-stats";

function arm(key: string, exposures: number, conversions: number, revenue = 0, variance?: number): ExperimentArm {
  return { key, label: key, exposures, conversions, revenue, variance };
}

test("conversion readiness sizes from the baseline and projects the slowest arm", () => {
  const result = calculateExperimentReadiness(
    [arm("control", 500, 50), arm("test", 250, 30)],
    "conversion_rate",
    { elapsedDays: 10, asOfMs: Date.parse("2026-09-22T00:00:00.000Z") },
  );

  assert.equal(result.status, "collecting");
  assert.equal(result.minimumDetectableEffect, 0.3);
  assert.ok((result.required ?? 0) > result.observed);
  assert.ok((result.remaining ?? 0) > 0);
  assert.ok((result.estimatedDaysRemaining ?? 0) > 0);
  assert.ok(Date.parse(result.estimatedCompletionAt ?? "") > Date.parse("2026-09-22T00:00:00.000Z"));
});

test("total progress can exceed 100% without hiding an underfilled variant", () => {
  const result = calculateExperimentReadiness(
    [arm("control", 100_000, 10_000), arm("test", 10, 1)],
    "conversion_rate",
  );

  assert.ok((result.remaining ?? 0) > 0);
  assert.ok((result.progress ?? 0) > 1);
  assert.equal(result.status, "collecting");
});

test("APPU readiness uses supplied per-user variance", () => {
  const noisy = calculateExperimentReadiness(
    [arm("control", 100, 10, 100, 25), arm("test", 100, 12, 120, 25)],
    "revenue_per_visitor",
  );
  const stable = calculateExperimentReadiness(
    [arm("control", 100, 10, 100, 0.25), arm("test", 100, 12, 120, 0.25)],
    "revenue_per_visitor",
  );

  assert.ok((noisy.required ?? 0) > (stable.required ?? 0));
  assert.equal(stable.minimumDetectableEffect, 0.3);
});

test("a result is only decisive after both the planned sample and probability threshold", () => {
  const belowTarget = calculateExperimentReadiness(
    [arm("control", 50, 5), arm("test", 50, 10)],
    "conversion_rate",
    { decisiveProbability: 0.99 },
  );
  assert.equal(belowTarget.status, "collecting");

  const target = belowTarget.required! / 2;
  const complete = calculateExperimentReadiness(
    [arm("control", target, target * 0.1), arm("test", target, target * 0.11)],
    "conversion_rate",
    { decisiveProbability: 0.99 },
  );
  assert.equal(complete.status, "decisive");
});
