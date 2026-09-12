# Notify — App Facts

iOS app that turns any HTTP request into a push notification on the user's iPhone. Built by me in a few days with Claude Code.

## Quick facts

- **Platform**: iOS only (iPhone, iCloud)
- **Pricing**: $4.99 one-time on the App Store. No subscription, no usage caps. (No free tier as of now.)
- **App Store link**: https://apps.apple.com/app/notify-push-notifications/id6763496503
- **Backend domain**: `push.tap-and-swipe.com`
- **Tagline candidates**: "One curl, one push notification on your iPhone." / "Webhook to push, no account."

## Tech stack

- SwiftUI iOS app
- Webhook URL generated on-device on first launch
- Webhook secret stored in iCloud Keychain (syncs across user's devices)
- Backend routes through APNs (Apple Push Notification Service)
- Server does NOT log message bodies, only routes
- Critical Alerts entitlement granted by Apple (separate review on top of App Store review)
- Build time: a few days of coding with Claude Code, then a separate Apple review for the Critical Alert entitlement

## Differentiators (vs ntfy, Pushover, Gotify)

- Native iOS feel, not a port from Android
- No account, no signup, no dashboard — webhook URL IS the auth
- Critical Alerts work (breaks through DnD, Focus, Sleep modes)
- Webhook secret stays in iCloud Keychain, never on the server
- Image attachments
- Tappable URLs in notifications
- Thread grouping
- No usage caps for the $4.99 price

## API

### Endpoint

```
POST https://push.tap-and-swipe.com/v1/send/<webhook-token>
```

The token is embedded in the URL path. Treat it like an API key.

### Methods

- `POST` with JSON body, form, or plain text
- `GET` with query params
- `Content-Type: application/json` recommended (some HTTP clients won't infer it)

### Body fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | yes | Bold first line of the notification (max 200 chars) |
| `subtitle` | string | no | Smaller line under the title (max 200 chars, single line) |
| `body` | string | no | Main message text, supports `\n` for multi-line (max 2000 chars; alias: `message`) |
| `sound` | string | no | `"default"` or `"none"` |
| `thread_id` | string | no | Groups related notifications |
| `interruption_level` | string | no | `"passive"`, `"active"`, `"time-sensitive"`, or `"critical"` |
| `priority` | string | no | Coming soon, currently ignored |
| `badge` | number | no | Icon badge count (`0` clears) |
| `category` | string | no | Notification category for registered custom actions |
| `url` | string | no | URL included in payload for tap handling (alias: `open_url`) |
| `image_url` | string | no | URL of image to attach (requires Notification Service Extension) |
| `filter_criteria` | string | no | APNs filter-criteria string for Focus filtering |
| `extra` | object | no | Custom payload keys forwarded alongside `aps`. JSON only |
| `expiration` | number \| string | no | Unix seconds or ISO 8601, drop the push if APNs can't deliver by then |

### Responses

- Success: `{"ok": true, "apns_id": "..."}` with HTTP 200
- Error: `{"error": "<code>", "message": "..."}` with 4xx/5xx status

### Example curl

```bash
curl -X POST https://push.tap-and-swipe.com/v1/send/<webhook-token> \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello","subtitle":"From Notify 🚀"}'
```

### Example JS

```javascript
await fetch("https://push.tap-and-swipe.com/v1/send/<webhook-token>", {
  method: "POST",
  body: JSON.stringify({ title: "Hello", subtitle: "From Notify 🚀" }),
});
```

### Example Python

```python
import requests
requests.post(
    "https://push.tap-and-swipe.com/v1/send/<webhook-token>",
    json={"title": "Hello", "subtitle": "From Notify 🚀"},
)
```

## Real example notifications used in marketing

Real shape: emoji prefix in title, dot-separated facts in body, `\n` for multi-line body.

### Daily revenue recap

```json
{
  "title": "💰 MRR Update",
  "body": "$11,960 total MRR\nSaaS $4,280 · Apps $7,680\n+12 trials · 3 new paid"
}
```

### Daily traffic recap

```json
{
  "title": "📊 Site Traffic 24h",
  "body": "12,400 views · 3,180 unique\nTop page: /pricing (28%)\n+14% vs 7-day avg"
}
```

## Use cases

Primary use cases pitched in marketing posts:

- **Claude Routines / Code agents** — get pinged when a long task finishes, or when an agent is waiting on input
- **Project alerts** — deploy failed, build broken, error spike, agent finished
- **Scripts / cron jobs** — daily SaaS recap, backup completed, scheduled report ready
- **GitHub Actions** — workflow failed, deploy live
- **n8n, Zapier, IFTTT** — generic webhook destination
- **Home Assistant** — leak sensor, door sensor, smoke alarm with Critical Alerts
- **Home server / homelab** — uptime alerts, disk space, certificate expiry

## Routines integration pattern

A Claude Routine pulls data via an MCP (Stripe connector for revenue, custom MCP for traffic) then directly curls the Notify webhook. No `notify_send` MCP tool needed — the Routine fires the curl itself.

Example Routine prompt for revenue:

```
"Pull last 24h from Stripe: total MRR with breakdown by product (SaaS and Apps),
new trials, new paid customers. Then POST to my Notify webhook URL with this
JSON: title '💰 MRR Update', body in 3 short lines (total / breakdown / trials
and new paid)."
```

## Things to remember

- Webhook URL contains a secret. Treat it like an API key. Don't share it publicly. Use `<webhook-token>` placeholder in posts.
- Critical Alerts require user to grant per-app permission in iOS Settings
- Notifications with the same `title` get grouped on the lock screen by iOS — vary `thread_id` to keep them in separate stacks
- "Time ago" timestamps on the lock screen reflect the device clock vs delivery time — server delivers in real time, any drift is device-side
- `subtitle` is single-line, `body` is multi-line. Prefer `body` for richer notifications.
- The `apns_id` in the success response confirms Apple accepted the push, but actual delivery to the device can be delayed (rare in production APNs, common in sandbox)
