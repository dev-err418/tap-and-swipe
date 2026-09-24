import assert from "node:assert/strict";
import test from "node:test";
import { installCohortCountries } from "../../lib/install-cohort-countries";

test("cohort proceeds and payers follow selected installs, even when older users pay in the period", () => {
  const rows = installCohortCountries({
    startMs: 100, endMs: 200,
    installs: [
      { appUserId: "new", country: "FR", installedAt: 120 },
      { appUserId: "free", country: "FR", installedAt: 150 },
      { appUserId: "old", country: "FR", installedAt: 50 },
    ],
    events: [
      { appUserId: "new", originalTransactionId: "a", name: "initial_purchase", periodType: "weekly", isTrialConversion: false, eventTs: 130, netProceeds: 10 },
      { appUserId: "new", originalTransactionId: "a", name: "renewal", periodType: "weekly", isTrialConversion: false, eventTs: 250, netProceeds: 5 },
      { appUserId: "old", originalTransactionId: "b", name: "renewal", periodType: "weekly", isTrialConversion: false, eventTs: 160, netProceeds: 50 },
    ],
  }, 300);
  assert.deepEqual(rows, [{ country: "FR", installs: 2, proceeds: 15, trials: 0, converted: 0, paid: 1 }]);
});
