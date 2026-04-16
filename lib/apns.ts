import { ApnsClient, Notification } from "apns2";

const signingKey = Buffer.from(process.env.APNS_KEY_P8!, "base64").toString(
  "utf-8"
);

const host =
  process.env.APNS_SANDBOX === "true"
    ? "api.sandbox.push.apple.com"
    : "api.push.apple.com";

const client = new ApnsClient({
  team: process.env.APNS_TEAM_ID!,
  keyId: process.env.APNS_KEY_ID!,
  signingKey,
  defaultTopic: process.env.APP_BUNDLE_ID!,
  host,
});

export async function sendPush(title: string, body: string) {
  const notification = new Notification(process.env.APNS_DEVICE_TOKEN!, {
    alert: { title, body },
    sound: "default",
  });
  await client.send(notification);
}
