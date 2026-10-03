import assert from "node:assert/strict";
import test from "node:test";
import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";
import { getAnalyticsAccess } from "../../lib/analytics-access";
import { loadTestModule } from "./helpers/load-test-module";

const albertoId = "643841344103776318";
const environment = {
  NODE_ENV: "production",
  ADMIN_DISCORD_ID: "owner",
  NEXT_PUBLIC_APP_URL: "https://tap-and-swipe.com",
  SESSION_SECRET: "test-only-session-secret",
  DISCORD_CLIENT_ID: "test-client",
};
const secret = new TextEncoder().encode(environment.SESSION_SECRET);
type AuthRoute = { GET(request: NextRequest): Promise<Response> };

async function callback(discordId: string, redirect?: string, validState = true) {
  const state = await new SignJWT(redirect ? { redirect } : {})
    .setProtectedHeader({ alg: "HS256" }).setExpirationTime("5m").sign(secret);
  const sessions: { discordId: string; ttl: string }[] = [];
  let userLookups = 0;
  const route = loadTestModule<AuthRoute>("app/api/auth/discord/callback/route.ts", {
    "jose": { jwtVerify },
    "next/headers": { cookies: async () => ({ get: () => ({ value: validState ? state : "wrong-state" }), delete: () => {} }) },
    "@/lib/discord": {
      exchangeCode: async () => ({ access_token: "test-only-access-token" }),
      getUser: async () => ({ id: discordId, username: "test-user", avatar: null }),
    },
    "@/lib/prisma": { prisma: { user: { upsert: async () => { userLookups++; return { subscriptionStatus: null }; } } } },
    "@/lib/session": { createSession: async (payload: { discordId: string }, ttl: string) => { sessions.push({ discordId: payload.discordId, ttl }); } },
    "@/lib/analytics-access": { getAnalyticsAccess: (id: string) => getAnalyticsAccess(id, { adminDiscordId: "owner", development: false }) },
  }, environment);
  const request = new NextRequest(`https://tap-and-swipe.com/api/auth/discord/callback?code=test-code&state=${state}`);
  return { response: await route.GET(request), sessions, userLookups };
}

test("analytics sign-in preserves only the allowed redirect inside the signed OAuth state", async () => {
  const cookies = new Map<string, string>();
  const route = loadTestModule<AuthRoute>("app/api/auth/discord/route.ts", {
    "jose": { SignJWT },
    "next/headers": { cookies: async () => ({ set: (name: string, value: string) => cookies.set(name, value) }) },
    "@/lib/prisma": { prisma: {} },
  }, environment);
  for (const redirect of ["analytics", "https://example.com", "analytics/../learn"]) {
    const response = await route.GET(new NextRequest(`https://tap-and-swipe.com/api/auth/discord?redirect=${encodeURIComponent(redirect)}`));
    const location = new URL(response.headers.get("location")!);
    const state = location.searchParams.get("state")!;
    assert.equal(cookies.get("discord_oauth_state"), state);
    const { payload } = await jwtVerify(state, secret);
    assert.equal(payload.redirect, redirect === "analytics" ? "analytics" : undefined);
  }
});

test("Alberto receives a seven-day analytics session without needing a course subscription", async () => {
  for (const redirect of ["analytics", undefined]) {
    const result = await callback(albertoId, redirect);
    assert.equal(result.response.headers.get("location"), "https://tap-and-swipe.com/analytics");
    assert.deepEqual(result.sessions, [{ discordId: albertoId, ttl: "7d" }]);
  }
});

test("unknown users cannot obtain an analytics session through the redirect", async () => {
  const result = await callback("stranger", "analytics");
  assert.equal(result.response.headers.get("location"), "https://tap-and-swipe.com/login?redirect=analytics&error=analytics_denied");
  assert.deepEqual(result.sessions, []);
});

test("the owner's analytics sign-in still works", async () => {
  const result = await callback("owner", "analytics");
  assert.equal(result.response.headers.get("location"), "https://tap-and-swipe.com/analytics");
  assert.deepEqual(result.sessions, [{ discordId: "owner", ttl: "7d" }]);
});

test("an invalid OAuth state cannot create Alberto's session or look up a user", async () => {
  const result = await callback(albertoId, "analytics", false);
  assert.equal(result.response.headers.get("location"), "https://tap-and-swipe.com/community?error=invalid_state");
  assert.deepEqual(result.sessions, []);
  assert.equal(result.userLookups, 0);
});
