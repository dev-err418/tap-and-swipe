import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Whop } from "@whop/sdk";

const root = fileURLToPath(new URL("../../", import.meta.url));
const deprecatedApi = /https?:\/\/api\.whop\.com\/(?:api\/)?v2\b|https?:\/\/api\.whop\.com\/public-graphql\b|["']@whop\/api["']/;

async function deprecatedCallers(directory: string): Promise<string[]> {
  const matches: string[] = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (relative === "lib/generated" || relative === "scripts/tests") continue;
      matches.push(...await deprecatedCallers(relative));
    } else if (/\.(?:[cm]?[jt]s|[jt]sx)$/.test(entry.name)) {
      const source = await readFile(path.join(root, relative), "utf8");
      source.split("\n").forEach((line, index) => {
        if (deprecatedApi.test(line)) matches.push(`${relative}:${index + 1}`);
      });
    }
  }
  return matches;
}

test("deployable code and maintenance scripts do not call retired Whop APIs", async () => {
  const matches = (await Promise.all(
    ["app", "lib", "mcp", "scripts"].map(deprecatedCallers),
  )).flat();
  assert.deepEqual(matches, [], `Retired Whop API calls remain in:\n${matches.join("\n")}`);
});

test("the retained checkout SDK calls the current API and preserves checkout metadata", async () => {
  const requests: URL[] = [];
  const metadata = { discordId: "123", visitorId: "visitor_test", tier: "full" };
  const whop = new Whop({
    apiKey: "test-key",
    maxRetries: 0,
    fetch: async (input, init) => {
      requests.push(new URL(String(input)));
      assert.equal(init?.method, "POST");
      assert.deepEqual(JSON.parse(String(init?.body)), { plan_id: "plan_test", metadata });
      return Response.json({ id: "ch_test", purchase_url: "https://whop.com/checkout/test" });
    },
  });
  const checkout = await whop.checkoutConfigurations.create({ plan_id: "plan_test", metadata });
  assert.equal(checkout.purchase_url, "https://whop.com/checkout/test");
  assert.deepEqual(requests.map(String), ["https://api.whop.com/api/v1/checkout_configurations"]);
});
