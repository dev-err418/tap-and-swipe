import assert from "node:assert/strict";
import { test } from "node:test";
import { hasAppSprintCheckout, resolveCommunityCourseAccess, isNewAppSprintCommunityMembership } from "../../lib/community-managed-access";

test("the direct purchase cutover delegates only new memberships on exact approved plans", () => {
  process.env.COMMUNITY_LAUNCH_AT = "2026-11-14T10:00:00Z";
  process.env.COMMUNITY_DIRECT_PLAN_IDS = "plan_new";
  try {
    assert.equal(isNewAppSprintCommunityMembership({ created_at: "2026-11-14T11:00:00Z", plan_id: "plan_new" }), true);
    assert.equal(isNewAppSprintCommunityMembership({ created_at: "2026-11-13T11:00:00Z", plan_id: "plan_new" }), false);
    assert.equal(isNewAppSprintCommunityMembership({ created_at: "2026-11-14T11:00:00Z", plan_id: "plan_other" }), false);
  } finally {
    delete process.env.COMMUNITY_LAUNCH_AT;
    delete process.env.COMMUNITY_DIRECT_PLAN_IDS;
  }
});

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
