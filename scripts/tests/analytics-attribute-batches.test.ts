import assert from "node:assert/strict";
import test from "node:test";
import { loadCompleteAttributeRows } from "../../lib/analytics-attribute-batches";

test("saturated queries split into complete disjoint batches without duplicating users' attributes", async () => {
  const rows = ["a", "b", "c"].flatMap((key) => [1, 2, 3].map((user) => ({ key, user })));
  const calls: string[][] = [];
  const result = await loadCompleteAttributeRows(["a", "b", "a", "c"], async (keys) => {
    calls.push(keys);
    return rows.filter((row) => keys.includes(row.key)).slice(0, 4);
  }, 4);
  assert.deepEqual(result, rows);
  assert.equal(new Set(result.map((row) => `${row.key}:${row.user}`)).size, 9);
  assert.equal(calls.length, 5);
});

test("small cohorts use one query and absent keys use none", async () => {
  let calls = 0;
  const load = async () => { calls++; return [1]; };
  assert.deepEqual(await loadCompleteAttributeRows([], load, 4), []);
  assert.equal(calls, 0);
  assert.deepEqual(await loadCompleteAttributeRows(["a"], load, 4), [1]);
  assert.equal(calls, 1);
});

test("a saturated single key or failed batch makes the report unavailable rather than silently partial", async () => {
  await assert.rejects(loadCompleteAttributeRows(["a"], async () => [1, 2], 2), /reporting limit/);
  await assert.rejects(loadCompleteAttributeRows(["a", "b"], async (keys) => {
    if (keys.length === 2) return [1, 2];
    if (keys[0] === "a") return [1];
    throw new Error("upstream unavailable");
  }, 2), /upstream unavailable/);
});
