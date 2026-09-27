import assert from "node:assert/strict";
import test from "node:test";
import { appVersionSide, availableAppVersions, compareAppVersions } from "../../lib/app-version-comparison";
import { loadUserJourney, userJourneySql } from "../../lib/user-journey-queries";
import { userJourneyDefinition } from "../../lib/user-journey";

test("version cutoffs compare numeric components and keep unknown installs out of both cohorts", () => {
  assert.equal(compareAppVersions("1.10", "1.9"), 1);
  assert.equal(compareAppVersions("1.7", "1.7.0"), 0);
  assert.equal(appVersionSide("1.6.9", "1.7"), "before");
  assert.equal(appVersionSide("1.7", "1.7"), "after");
  assert.equal(appVersionSide("1.8", "1.7"), "after");
  assert.equal(appVersionSide("Unknown", "1.7"), null);
  assert.deepEqual(availableAppVersions(["1.9", "1.10", "1.7", "1.10", "Unknown"]), ["1.10", "1.9", "1.7"]);
});

test("journey comparison sums version groups before calculating screen shares", async () => {
  const definition = userJourneyDefinition("glow")!;
  const sql = userJourneySql(54736, definition, "2026-09-01 00:00:00.000", "2026-09-30 00:00:00.000", true);
  assert.match(sql, /argMin\(JSONExtractString\(meta, 'appVersion'\), ts\)/);
  assert.match(sql, /GROUP BY variant, step, version/);
  const report = await loadUserJourney(async <T>() => [
    { variant: "iam", key: "__assigned__", version: "1.6", users: 10 },
    { variant: "iam", key: "welcome_screen_seen", version: "1.6", users: 8 },
    { variant: "iam", key: "__assigned__", version: "1.7", users: 20 },
    { variant: "iam", key: "welcome_screen_seen", version: "1.7", users: 18 },
    { variant: "iam", key: "__assigned__", version: "1.8", users: 30 },
    { variant: "iam", key: "welcome_screen_seen", version: "1.8", users: 27 },
  ] as T[], "glow", 54736, "2026-09-01 00:00:00.000", "2026-09-30 00:00:00.000", "1.7");
  assert.equal(report.variants[0].assigned, 60);
  assert.equal(report.versionComparison?.before.variants[0].assigned, 10);
  assert.equal(report.versionComparison?.after.variants[0].assigned, 50);
  assert.equal(report.versionComparison?.after.variants[0].steps[0].users, 45);
  assert.equal(report.versionComparison?.after.variants[0].steps[0].share, 0.9);
});
