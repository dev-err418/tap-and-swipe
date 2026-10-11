import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JourneyVersionComparison } from "../../components/analytics/UserJourneyFunnel";
import { ASSIGNED_KEY, journeyVersion, userJourneyDefinition, withJourneyInstallVersions } from "../../lib/user-journey";
import { loadUserJourney, userJourneySql } from "../../lib/user-journey-queries";

const definition = userJourneyDefinition("versy")!;
const key = definition.variants[0].key;
const step = definition.variants[0].steps[0].attribute;

test("first version is selected from all production history before applying the install window", () => {
  const sql = userJourneySql(51393, definition, "2026-10-01 00:00:00", "2026-10-11 00:00:00", true);
  assert.match(sql, /argMin\(JSONExtractString\(meta, 'appVersion'\), ts\) AS version/);
  assert.match(sql, /argMin\(appInstallDate, ts\) AS firstInstallDate/);
  assert.match(sql, /GROUP BY appUserId\s+HAVING firstInstallDate >=/);
  assert.doesNotMatch(sql, /AND ts >=|AND appInstallDate >=|argMax|argMinIf/);
  assert.match(sql, /GROUP BY variant, step, version/);
  assert.match(sql, /isSandbox = 0/);
});

test("version cohorts sum into the combined report and preserve unknown first metadata", async () => {
  const report = await loadUserJourney(async <T,>() => [
    { variant: key, version: "1.2.1", key: ASSIGNED_KEY, users: 10 },
    { variant: key, version: "1.2.1", key: step, users: 8 },
    { variant: key, version: "1.2.2", key: ASSIGNED_KEY, users: 20 },
    { variant: key, version: "1.2.2", key: step, users: 12 },
    { variant: key, version: "", key: ASSIGNED_KEY, users: 3 },
    { variant: key, version: "malformed", key: ASSIGNED_KEY, users: 2 },
  ] as T[], "versy", 51393, "2026-10-01 00:00:00", "2026-10-11 00:00:00");
  assert.equal(report.variants[0].assigned, 35);
  assert.equal(report.variants[0].steps[0].users, 20);
  assert.equal(report.versions?.find((row) => row.version === "unknown")?.tracked, 5);
  assert.equal(report.versions?.find((row) => row.version === "1.2.2")?.variants[0].steps[0].share, 0.6);
  assert.equal(journeyVersion(""), "unknown");
  assert.equal(journeyVersion("1.2.2-beta"), "unknown");
});

test("latest versions sort numerically and old uninstrumented installs do not become zero-percent funnels", async () => {
  const report = await loadUserJourney(async <T,>() => [
    { variant: key, version: "1.2.10", key: ASSIGNED_KEY, users: 1 },
    { variant: key, version: "1.2.10", key: step, users: 1 },
  ] as T[], "versy", 51393, "2026-10-01 00:00:00", "2026-10-11 00:00:00");
  const enriched = withJourneyInstallVersions(report, [
    { appVersion: "1.2.9" }, { appVersion: "1.2.9" },
    { appVersion: "1.2.10" }, { appVersion: "1.2.1" }, { appVersion: "" },
  ])!;
  assert.deepEqual(enriched.versions?.map((row) => row.version), ["1.2.10", "1.2.9", "1.2.1", "unknown"]);
  assert.equal(enriched.versions?.[1].installs, 2);
  assert.equal(enriched.versions?.[1].tracked, 0);
  assert.deepEqual(enriched.versions?.[1].variants, []);
  const html = renderToStaticMarkup(createElement(JourneyVersionComparison, {
    cohorts: enriched.versions!.slice(0, 3),
  }));
  assert.match(html, /v1.2.10/);
  assert.match(html, /v1.2.9/);
  assert.doesNotMatch(html, /Reached paywall|Tracked route starts|step drop-off/);
  assert.match(html, /—/);
});
