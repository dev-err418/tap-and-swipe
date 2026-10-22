import assert from "node:assert/strict";
import test from "node:test";
import { compareArpu } from "../../lib/arpu-comparison";
import { emptyVersionConversions } from "../../lib/version-cohort-conversions";

function row(key: string, mean = 2, variance = 9, installs = 100) {
  return { key, metric: { ...emptyVersionConversions().global, installs, proceeds: mean * installs, proceedsVariance: variance } };
}

test("Win % uses APPU and user variance, is reproducible and does not depend on row order", () => {
  const rows = [row("a"), row("b"), row("c")];
  const results = compareArpu(rows);
  for (const result of results) assert.ok(Math.abs(result.winProbability! - 1 / 3) < 0.015);
  assert.ok(Math.abs(results.reduce((sum, result) => sum + result.winProbability!, 0) - 1) < 1e-12);
  assert.deepEqual(compareArpu(rows), results);
  const reordered = compareArpu([...rows].reverse());
  for (const result of results) assert.equal(reordered.find((candidate) => candidate.key === result.key)!.winProbability, result.winProbability);
  assert.equal(results[0].isBaseline, true);
  assert.equal(results[0].interval, null);
});

test("higher APPU drives wins independently of conversion metrics; wider variance widens lift intervals", () => {
  const control = row("a");
  const treatment = row("b", 4);
  const result = compareArpu([control, treatment])[1];
  assert.equal(result.lift, 1);
  assert.ok(result.winProbability! > 0.99);
  assert.ok(result.interval![0] > 0);
  const changedConversions = { ...treatment, metric: { ...treatment.metric, trials: 90, paid: 80, installPaid: 99 } };
  assert.deepEqual(compareArpu([control, changedConversions])[1], result);
  const wider = compareArpu([control, row("b", 4, 900)])[1];
  assert.ok(wider.interval![1] - wider.interval![0] > result.interval![1] - result.interval![0]);
  assert.ok(wider.winProbability! < result.winProbability!);
});

test("missing money, insufficient installs and zero revenue never manufacture Win %", () => {
  for (const rows of [
    [row("a", 0, 0), row("b", 0, 0)],
    [row("a"), row("b", 2, 9, 19)],
    [row("a"), { ...row("b"), metric: { ...row("b").metric, missingProceeds: true } }],
    [row("a"), { key: "b" }],
    [row("a"), { ...row("b"), metric: { ...row("b").metric, proceedsVariance: null } }],
  ]) {
    for (const result of compareArpu(rows)) {
      assert.equal(result.winProbability, null);
      assert.equal(result.interval, null);
      assert.ok(result.reason);
    }
  }
});

test("zero or uncertain baseline has no misleading relative interval; empty rows are excluded", () => {
  const zeroBaseline = compareArpu([row("a", 0), row("b")]);
  assert.equal(zeroBaseline[1].lift, null);
  assert.equal(zeroBaseline[1].interval, null);
  assert.ok(zeroBaseline[1].winProbability! > 0.99);
  assert.equal(compareArpu([row("a", 0.1), row("b")])[1].interval, null);
  const results = compareArpu([{ key: "empty", metric: emptyVersionConversions().global }, row("a"), row("b")]);
  assert.equal(results[0].lift, null);
  assert.equal(results[0].winProbability, null);
  assert.equal(results[1].baseline, "a");
  assert.ok(Math.abs(results[1].winProbability! - 0.5) < 0.02);
});

test("APPU lift intervals use an 85% two-sided confidence level", () => {
  const result = compareArpu([row("a"), row("b", 4)])[1];
  const standardError = Math.sqrt((9 / 100) / 2 ** 2 + 4 ** 2 * (9 / 100) / 2 ** 4);
  const margin = 1.4395314709384563 * standardError;
  assert.ok(Math.abs(result.interval![0] - (1 - margin)) < 1e-12);
  assert.ok(Math.abs(result.interval![1] - (1 + margin)) < 1e-12);
});
