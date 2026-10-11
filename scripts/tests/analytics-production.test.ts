import assert from "node:assert/strict";
import test from "node:test";
import { productionAnalyticsFilter } from "../../lib/analytics-production";

test("requires production metadata and only resolves anonymous renewals to production purchase chains", () => {
  const attributes = new Map([
    ["live", { versy_tracking_environment: "production" }],
    ["debug", { versy_tracking_environment: "development" }],
    ["sandbox", { versy_tracking_environment: "sandbox" }],
  ]);
  const filter = productionAnalyticsFilter(attributes, "versy_tracking_environment", [
    { appUserId: "live", originalTransactionId: "live-chain", name: "initial_purchase" },
    { appUserId: "debug", originalTransactionId: "debug-chain", name: "initial_purchase" },
  ]);
  assert.equal(filter.user("live"), true);
  for (const user of ["debug", "sandbox", "unknown", ""]) assert.equal(filter.user(user), false);
  assert.equal(filter.event({ appUserId: "", originalTransactionId: "live-chain" }), true);
  assert.equal(filter.event({ appUserId: "", originalTransactionId: "debug-chain" }), false);
  assert.equal(filter.event({ appUserId: "debug", originalTransactionId: "live-chain" }), false);
});
