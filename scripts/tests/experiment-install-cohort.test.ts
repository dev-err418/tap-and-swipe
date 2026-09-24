import assert from "node:assert/strict";
import test from "node:test";
import { matchedCohortInstall } from "../../lib/experiment-install-cohort";

test("experiment outcomes require a tracked install and use its timestamp", () => {
  const install = { appUserId: "member", country: "FR", installedAt: 100 };
  const cohort = new Map([[install.appUserId, install]]);
  assert.equal(matchedCohortInstall(cohort, { appUserId: "missing", eventTs: 120 }, 200), null);
  assert.equal(matchedCohortInstall(cohort, { appUserId: "member", eventTs: 99 }, 200), null);
  assert.equal(matchedCohortInstall(cohort, { appUserId: "member", eventTs: 201 }, 200), null);
  assert.equal(matchedCohortInstall(cohort, { appUserId: "member", eventTs: 120 }, 200), install);
});
