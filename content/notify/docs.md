# Notify API Docs

Send a push notification to your iPhone with one HTTP request.

> ⚠️ **Your webhook URL is a secret.** It contains the only credential the server uses to authorize a push to your device. Treat it like an API key: never commit it to public source control, prefer environment variables or a secrets manager, and rotate it inside the app if it leaks.

## Base URL

```
https://push.tap-and-swipe.com
```

All requests must be HTTPS.

## Authentication

There is no account. The `webhook_id` in the URL (or `Authorization` header) *is* the credential. When you open the Notify app, it shows your webhook URL — copy it and use it anywhere you can make an HTTP request.

There are two equivalent ways to authenticate:

### 1. Path-based (simplest)

```
POST https://push.tap-and-swipe.com/v1/send/<webhook_id>
```

### 2. Header-based

```
POST https://push.tap-and-swipe.com/v1/send
Authorization: Bearer <webhook_id>
```

Use whichever fits your tool. The path-based form is handy for cURL one-liners; the header form is cleaner when `webhook_id` is already in an environment variable.

## Methods

The endpoint accepts both `POST` and `GET` requests. Use `POST` for anything beyond trivial, and `GET` when you need a shareable URL (for example, a webhook trigger in a service that only supports `GET`).

### POST — JSON

```
Content-Type: application/json
```

Send fields in the request body as JSON.

### POST — form-encoded

```
Content-Type: application/x-www-form-urlencoded
```

Send fields as URL-encoded form data. Useful for services that can't easily send JSON.

### POST — plain text

```
Content-Type: text/plain
```

The entire body is treated as the `body` field. Great for shell scripts that just pipe a message.

### GET — query parameters

Put fields in the query string:

```
GET /v1/send/<webhook_id>?title=Hello&body=World
```

The body is limited by URL length — prefer POST for anything long.

## Body fields

All fields are optional except `title`. Any unknown field is ignored.

| Field                  | Type              | Description                                                                                                   |
| ---------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| `title`                | string (required) | Main notification title. Shows as the bold line in the banner.                                                |
| `subtitle`             | string            | Secondary line shown under the title.                                                                         |
| `body` (alias `message`) | string          | Main text body of the notification. `message` is accepted as an alias.                                        |
| `sound`                | string            | `"default"` (default) for the standard sound, or `"none"` to deliver silently.                                |
| `thread_id`            | string            | Groups notifications together in the notification center. Use the same value to group related pushes.         |
| `interruption_level`   | string            | One of `passive`, `active` (default), `time-sensitive`, `critical`. Controls whether the push wakes the screen, bypasses focus modes, etc. |
| `priority`             | string            | `high` (default) or `normal`. `normal` lets iOS batch delivery to save battery.                                |
| `badge`                | number            | Sets the red badge count on the app icon. `0` clears the badge.                                                |
| `category`             | string            | Category identifier for a registered notification category (used for custom actions).                          |
| `url` (alias `open_url`) | string          | URL to open when the notification is tapped. Both fields are accepted.                                         |
| `image_url`            | string            | HTTPS URL of an image to attach to the notification (jpg/png/gif).                                             |
| `expiration`           | number or string  | Unix timestamp in seconds *or* an ISO 8601 datetime. If the push can't be delivered by this time, APNs drops it. |

## Responses

### Success

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "ok": true,
  "apns_id": "9A9E1E9C-6C8D-4C2E-9F4E-1B2A3C4D5E6F"
}
```

`apns_id` is the unique identifier Apple assigns to the push for tracing.

### Errors

```
HTTP/1.1 4xx|5xx
Content-Type: application/json

{
  "error": "invalid_webhook",
  "message": "Webhook ID not recognized."
}
```

Common error codes:

| Code                  | HTTP | Meaning                                                              |
| --------------------- | ---- | -------------------------------------------------------------------- |
| `invalid_webhook`     | 401  | Webhook ID missing or unrecognized.                                  |
| `missing_title`       | 400  | The `title` field is required and was not provided.                  |
| `payload_too_large`   | 413  | Total payload exceeded the APNs limit (4 KB).                        |
| `rate_limited`        | 429  | Too many requests for this webhook.                                  |
| `apns_error`          | 502  | Apple rejected the push. The `message` field has Apple's reason.     |
| `device_unregistered` | 410  | Apple reports the device token is no longer valid (app uninstalled, notifications disabled, etc.). |

## Examples

### cURL

Minimal:

```bash
curl -X POST "https://push.tap-and-swipe.com/v1/send/$NOTIFY_WEBHOOK_ID" \
  -H "Content-Type: application/json" \
  -d '{"title":"Build finished","body":"All tests passed."}'
```

With more fields:

```bash
curl -X POST "https://push.tap-and-swipe.com/v1/send" \
  -H "Authorization: Bearer $NOTIFY_WEBHOOK_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Deploy failed",
    "subtitle": "production",
    "body": "Tests failed on main @ a1b2c3d.",
    "interruption_level": "time-sensitive",
    "badge": 1,
    "thread_id": "ci-deploy",
    "url": "https://github.com/you/repo/actions/runs/12345"
  }'
```

Plain-text body (the whole request body is used as the `body` field — pair it with a `title` query param):

```bash
echo "Coffee is ready." | curl -X POST \
  "https://push.tap-and-swipe.com/v1/send/$NOTIFY_WEBHOOK_ID?title=Kitchen" \
  -H "Content-Type: text/plain" \
  --data-binary @-
```

### JavaScript (fetch)

```javascript
const webhookId = process.env.NOTIFY_WEBHOOK_ID;

async function notify(payload) {
  const res = await fetch(`https://push.tap-and-swipe.com/v1/send/${webhookId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Notify failed: ${res.status} ${err.error ?? ""}`);
  }
  return res.json();
}

await notify({
  title: "Backup complete",
  body: "12.3 GB archived in 4m 22s.",
  thread_id: "backups",
});
```

### Python (requests)

```python
import os
import requests

WEBHOOK_ID = os.environ["NOTIFY_WEBHOOK_ID"]
URL = f"https://push.tap-and-swipe.com/v1/send/{WEBHOOK_ID}"

def notify(**fields):
    r = requests.post(URL, json=fields, timeout=10)
    r.raise_for_status()
    return r.json()

notify(
    title="Cron done",
    body="nightly-report.py exited 0",
    interruption_level="passive",
    thread_id="cron",
)
```

### Go

```go
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

type Payload struct {
	Title             string `json:"title"`
	Body              string `json:"body,omitempty"`
	Subtitle          string `json:"subtitle,omitempty"`
	ThreadID          string `json:"thread_id,omitempty"`
	InterruptionLevel string `json:"interruption_level,omitempty"`
	URL               string `json:"url,omitempty"`
	Badge             int    `json:"badge,omitempty"`
}

func Notify(p Payload) error {
	webhookID := os.Getenv("NOTIFY_WEBHOOK_ID")
	body, err := json.Marshal(p)
	if err != nil {
		return err
	}
	url := fmt.Sprintf("https://push.tap-and-swipe.com/v1/send/%s", webhookID)
	req, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return fmt.Errorf("notify: status %d", resp.StatusCode)
	}
	return nil
}

func main() {
	_ = Notify(Payload{
		Title:             "Deploy finished",
		Body:              "v2.4.1 is live",
		ThreadID:          "deploys",
		InterruptionLevel: "active",
	})
}
```

## Tips & patterns

- **Group related pushes** with `thread_id`. For example, use `"ci"` for all CI notifications so they collapse in the notification center.
- **Use `interruption_level: "passive"`** for low-priority status updates — they'll be delivered quietly and won't wake the screen.
- **Use `interruption_level: "time-sensitive"`** for things you actually need to see *now* (bypasses most focus modes).
- **Set `badge: 0`** from a script to clear the badge on the app icon — useful as a "mark as read" signal.
- **Store the webhook URL in an env var**, not in code. A common pattern is `NOTIFY_WEBHOOK_ID` in your shell profile, CI secrets, or `.env` (gitignored).
- **Rotate the webhook** inside the app if it leaks. The old URL will stop working immediately.

## Contact

For bug reports, feature requests, or integration questions: **support@tap-and-swipe.com**.
