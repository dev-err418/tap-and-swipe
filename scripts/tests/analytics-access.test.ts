import assert from "node:assert/strict";
import test from "node:test";
import {
  ANALYTICS_APP_IDS,
  canAccessAnalyticsApp,
  canAccessAnalyticsPage,
  getAnalyticsAccess,
} from "../../lib/analytics-access";

const albertoId = "643841344103776318";
const production = { adminDiscordId: "owner", development: false };

test("Alberto's Discord account has only Poky access and his requested greeting", () => {
  const access = getAnalyticsAccess(albertoId, production)!;
  assert.equal(access.name, "alberto");
  assert.deepEqual(access.appIds, ["poky"]);
  assert.equal(access.canManage, false);
  assert.equal(canAccessAnalyticsApp(access, "poky"), true);
  for (const id of ["glow", "versy", "unknown"]) {
    assert.equal(canAccessAnalyticsApp(access, id), false);
  }
});

test("Alberto cannot open other apps, websites, or operations through query parameters", () => {
  const access = getAnalyticsAccess(albertoId, production)!;
  assert.equal(canAccessAnalyticsPage(access, {}), true);
  assert.equal(canAccessAnalyticsPage(access, { app: "poky", tab: "analytics" }), true);
  for (const app of ["glow", "versy", "unknown"]) {
    assert.equal(canAccessAnalyticsPage(access, { app }), false);
  }
  for (const site of ["appsprint", "postback", "grewit", "community"]) {
    assert.equal(canAccessAnalyticsPage(access, { site }), false);
    assert.equal(canAccessAnalyticsPage(access, { app: "poky", site }), false);
  }
  for (const tab of ["appsprint", "aso"]) {
    assert.equal(canAccessAnalyticsPage(access, { tab }), false);
  }
});

test("the owner retains access to every project", () => {
  const access = getAnalyticsAccess("owner", production)!;
  assert.equal(access.name, "Arthur");
  assert.deepEqual(access.appIds, ANALYTICS_APP_IDS);
  assert.equal(access.canManage, true);
  assert.equal(canAccessAnalyticsPage(access, { tab: "appsprint" }), true);
});

test("missing, unknown, and prototype-named identities fail closed", () => {
  for (const id of [null, undefined, "", "stranger", "toString", "constructor", "__proto__"]) {
    assert.equal(getAnalyticsAccess(id, production), null);
  }
  assert.equal(getAnalyticsAccess("stranger", { adminDiscordId: "", development: false }), null);
});

test("development preview does not override a signed-in viewer's scope", () => {
  const development = { ...production, development: true };
  assert.equal(getAnalyticsAccess(null, development)?.canManage, true);
  assert.deepEqual(getAnalyticsAccess(albertoId, development)?.appIds, ["poky"]);
  assert.equal(getAnalyticsAccess("stranger", development), null);
});
