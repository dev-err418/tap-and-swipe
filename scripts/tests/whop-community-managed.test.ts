import assert from "node:assert/strict";
import { test } from "node:test";
import { hasAppSprintCheckout, resolveCommunityCourseAccess } from "../../lib/community-managed-access";

test("only checkout metadata with the full AppSprint proof delegates fulfillment", () => {
  assert.equal(hasAppSprintCheckout({ metadata: { community_checkout_id: "id" } }), false);
  assert.equal(hasAppSprintCheckout(null, { metadata: {
    community_checkout_id: "id", community_checkout_hash: "hash", community_checkout_signature: "signature",
  } }), true);
});

test("a new website member can enter the course with the linked Discord account", () => {
  const user = { discordId: "123", subscriptionStatus: null };
  assert.equal(resolveCommunityCourseAccess(user, [{ id: "mem_new", discord_user_id: "123", active: true }]), true);
  assert.equal(resolveCommunityCourseAccess(user, [{ id: "mem_new", discord_user_id: "456", active: true }]), false);
  assert.equal(resolveCommunityCourseAccess(user, [{ id: "mem_new", discord_user_id: "123", active: false }]), false);
});

test("expiry revokes migrated course access while separate legacy paid access is preserved", () => {
  const user = { discordId: "123", whopMembershipId: "mem_old", subscriptionStatus: "active" };
  assert.equal(resolveCommunityCourseAccess(user, [{ id: "mem_old", discord_user_id: "123", active: false }]), false);
  assert.equal(resolveCommunityCourseAccess(user, [{ id: "mem_other", discord_user_id: "123", active: false }]), true);
});
