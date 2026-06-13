# Plunk Campaign Runbook

This folder stores Tap & Swipe newsletter campaign HTML and the repeatable process for creating, testing, updating, and sending Plunk campaigns.

## Audience Rule

Newsletter campaigns should target only contacts who are:

- globally subscribed in Plunk
- `data.onboarded === "true"`

The helper script creates Plunk campaigns as `HEADLESS` campaigns with a filtered audience:

```json
{
  "audienceType": "FILTERED",
  "audienceCondition": {
    "logic": "AND",
    "groups": [
      {
        "filters": [
          {
            "field": "data.onboarded",
            "operator": "equals",
            "value": "true"
          }
        ]
      }
    ]
  }
}
```

Use `HEADLESS` because the HTML already includes the branded unsubscribe link. Plunk still respects opt-outs for headless campaigns.

## HTML Format

Use one HTML file per campaign:

```text
plunk-campaigns/YYYY-MM-DD-short-slug.html
```

Follow the same layout as `2026-05-15-aleksei-evelize.html`:

- white background
- `592px` max-width wrapper
- Tap & Swipe banner image at the top
- optional right-aligned date line
- plain editorial copy from Arthur
- one useful standalone takeaway section before the CTA
- case study CTA and YouTube CTA
- footer with SIREN and unsubscribe link

The unsubscribe link must stay in the email:

```html
https://tap-and-swipe.com/unsubscribe/{{id}}
```

Use tracked links:

```text
?utm_source=newsletter&utm_medium=email&utm_campaign=<campaign_slug>
```

## Copy Pattern

The email should be valuable even if the reader does not click. Use the old drip emails as the voice reference:

- `listmonk-templates/email-templates/welcome.html`
- `listmonk-templates/email-templates/drip-day-2.html`
- `listmonk-templates/email-templates/drip-day-4.html`
- `listmonk-templates/email-templates/drip-day-6.html`

The drip style is plain and direct: short paragraphs, simple hooks, normal words, a few honest opinions, and no polished "content framework" feeling.

Structure:

1. Hook: one sentence that makes the story worth opening.
2. Context: who the founder is, what the app does, and the revenue.
3. Useful bit: 4-5 concrete takeaways the reader can apply.
4. Curiosity gap: mention the messy/full story details that are only in the case study or YouTube episode.
5. CTA: read the case study first, then watch the episode.
6. PS: one builder-specific takeaway.

Avoid making the email only a teaser. Give the reader a real lesson, then point them to the article for the full story, quotes, and nuance.

Avoid:

- bold mini-headings inside every bullet
- numbered frameworks unless the idea genuinely needs steps
- "the useful bit" / "key takeaways" style section names
- overly balanced phrasing that sounds like a summary tool wrote it

## Helper Script

Campaigns are managed with:

```bash
npx tsx scripts/plunk-newsletter-campaign.ts <command>
```

Before a new campaign, update the `CAMPAIGN` object in `scripts/plunk-newsletter-campaign.ts`:

- `name`
- `description`
- `subject`
- `htmlPath`

The script loads Plunk credentials from `.env.local`:

- `PLUNK_API_URL`
- `PLUNK_API_KEY`

Optional sender overrides:

- `PLUNK_NEWSLETTER_FROM`
- `PLUNK_NEWSLETTER_FROM_NAME`
- `PLUNK_NEWSLETTER_REPLY_TO`
- `PLUNK_TEST_EMAIL`

Defaults:

- from: `arthur@tap-and-swipe.com`
- from name: `Arthur from Tap & Swipe`
- reply-to: same as from

## Commands

Preview the audience before touching Plunk drafts:

```bash
npx tsx scripts/plunk-newsletter-campaign.ts preview
```

Create a draft and send a test:

```bash
npx tsx scripts/plunk-newsletter-campaign.ts test arthurs.dev@gmail.com
```

Plunk only allows campaign test sends to project members. If another address fails with `Test emails can only be sent to project members`, use `arthurs.dev@gmail.com` or add the recipient as a Plunk project member.

Update an existing draft after editing the HTML:

```bash
npx tsx scripts/plunk-newsletter-campaign.ts update <campaign-id>
```

Send another test from an existing draft:

```bash
npx tsx scripts/plunk-newsletter-campaign.ts test-existing <campaign-id> arthurs.dev@gmail.com
```

Send to all onboarded subscribers only after reviewing the test:

```bash
npx tsx scripts/plunk-newsletter-campaign.ts send <campaign-id> --confirm-send-all
```

Schedule a send for later:

```bash
npx tsx scripts/plunk-newsletter-campaign.ts schedule <campaign-id> "2026-05-15T16:00:00+02:00" --confirm-send-all
```

Prefer an ISO datetime with a timezone offset, especially when scheduling from Europe/Oslo. The script converts the time to UTC before sending it to Plunk.

The script refuses immediate and scheduled bulk sends without `--confirm-send-all`.

## Verification

Run these before considering the campaign ready:

```bash
npx tsc --noEmit --pretty false
npm run lint -- scripts/plunk-newsletter-campaign.ts
npx tsx scripts/plunk-newsletter-campaign.ts preview
```

Confirm in Plunk that the campaign is:

- `DRAFT` before sending
- `HEADLESS`
- `FILTERED`
- recipient count matches the preview count

For the first campaign on May 15, 2026, preview returned:

```text
Contacts total: 88
Onboarded true: 60
Subscribed + onboarded true recipients: 59
```

## First Campaign Reference

Campaign HTML:

```text
plunk-campaigns/2026-05-15-aleksei-evelize.html
```

Plunk draft:

```text
93e0bc9f-7e73-4362-a868-82522fd55fac
```

Subject:

```text
A backend engineer built a $17K/month app on the side
```

Test send succeeded to:

```text
arthurs.dev@gmail.com
```
