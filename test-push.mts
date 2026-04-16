import { config } from "dotenv";
config({ path: ".env.local" });
import { ApnsClient, Notification } from "apns2";

const token = process.argv[2];

if (!token) {
  console.error("Usage: node test-push.mts <device-token>");
  process.exit(1);
}

const signingKey = Buffer.from(process.env.APNS_KEY_P8!, "base64").toString("utf-8");
const client = new ApnsClient({
  team: process.env.APNS_TEAM_ID!,
  keyId: process.env.APNS_KEY_ID!,
  signingKey,
  defaultTopic: process.env.APP_BUNDLE_ID!,
  host: "api.sandbox.push.apple.com",
});

const n = new Notification(token, {
  alert: { title: "Hello", body: "Test from local script" },
  sound: "default",
});

try {
  await client.send(n);
  console.log("SUCCESS - check your phone");
} catch (err: any) {
  console.log("FAILED:", err.response?.reason ?? err.message);
}
await client.close();
