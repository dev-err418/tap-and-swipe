type NotifyPayload = {
  title: string;
  subtitle?: string;
  body?: string;
  url?: string;
  interruption_level?: "passive" | "active" | "time-sensitive" | "critical";
  thread_id?: string;
};

export async function sendPushNotification(payload: NotifyPayload) {
  const target = process.env.NOTIFY_URL;
  if (!target) {
    console.error("NOTIFY_URL not set, skipping push notification");
    return;
  }

  const res = await fetch(target, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`Notify webhook failed (${res.status}): ${text.slice(0, 300)}`);
  }
}
