import assert from "node:assert/strict";
import { test } from "node:test";
import { deliverLicenseEmailOnce } from "../../lib/license-email-delivery";

test("failed email releases its claim and rejects so Whop retries", async () => {
  const writes: string[] = [];
  await assert.rejects(deliverLicenseEmailOnce("key", true, async (sql) => {
    writes.push(sql);
    return { rows: writes.length === 1 ? [{ key: "key" }] : [] };
  }, async () => false), /retry webhook/);
  assert.equal(writes.length, 2);
  assert.match(writes[1], /license_email_claimed_until = NULL/);
  assert.match(writes[1], /plunk_send_failed/);
  assert.doesNotMatch(writes[1], /license_email_sent_at = now/);
});

test("retry sends the existing key and marks delivery only after success", async () => {
  const order: string[] = [];
  const sent = await deliverLicenseEmailOnce("existing-key", false, async (sql, values) => {
    assert.equal(values[0], "existing-key");
    if (!order.length) {
      order.push("claim");
      assert.equal(values[1], false);
      return { rows: [{ key: "existing-key" }] };
    }
    order.push("mark");
    assert.match(sql, /license_email_sent_at = now/);
    return { rows: [] };
  }, async () => { order.push("send"); return true; });
  assert.equal(sent, true);
  assert.deepEqual(order, ["claim", "send", "mark"]);
});

test("delivered email and historical unmarked licenses are not resent on renewals", async () => {
  for (const sentAt of [new Date(), null]) {
    let queries = 0;
    const result = await deliverLicenseEmailOnce("key", false, async () => ({
      rows: ++queries === 1 ? [] : [{ license_email_sent_at: sentAt, license_email_claimed_until: null }],
    }), async () => { assert.fail("must not resend"); });
    assert.equal(result, false);
  }
});

test("concurrent delivery asks Whop to retry rather than acknowledging an unfinished send", async () => {
  let queries = 0;
  await assert.rejects(deliverLicenseEmailOnce("key", false, async () => ({
    rows: ++queries === 1 ? [] : [{ license_email_sent_at: null, license_email_claimed_until: new Date() }],
  }), async () => { assert.fail("claim is held by another webhook"); }), /in progress/);
});
