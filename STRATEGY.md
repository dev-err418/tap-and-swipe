# Reddit Marketing Strategy — Notify

Account state: 5 years old, ~390 karma, 252 contributions. Past the warming phase, can post immediately. Should still warm specific subs with a few thoughtful comments before posting in them.

## The course playbook (compressed)

### Why Reddit

6th most-visited site online. Google ranks Reddit posts. ChatGPT/Claude/Perplexity scrape it. One post can drive traffic for months.

### Universal post structure

```
TITLE     A concrete number or result, not vague pain
PROBLEM   Name the exact pain
SOLUTION  Detailed, generous, step-by-step (don't hold back the "good stuff")
PROOFS    Screenshots, numbers, real results
END       "Questions? Happy to answer" + product name only
```

### Five formats that work

1. **Detailed Solution** — "How I cut X by 60% in 6 weeks"
2. **Tool List** — "My free stack to do Y"
3. **Honest Autopsy** — "I wasted $8K on Z, here's what I should have done"
4. **AMA** — "I built 3 SaaS in 18 months, ask me anything"
5. **Narrative (highest-converting)** — "0 to $14K MRR in 3 months, here's exactly what worked"

### Hard rules

- **Title** = a real number / concrete result, never vague pain or "Here's a tool I built"
- **Lead with story/moment**, not the build or competitor pain (don't open with "existing tools sucked")
- **Mention product name once** in the body
- **Link**: in `r/SideProject` and `r/ClaudeAI` it's allowed in body. In every other sub, drop it in the FIRST COMMENT
- **Anchor links on a keyword** when you do drop them, never "click here"
- **First 5 minutes**: get a few upvotes
- **First 48 hours**: reply to every comment, ignore haters, never argue
- **Cadence**: 1 post per sub per week max. Validation phase = 3 posts/week × 3 different subs × 3 weeks
- **Never recycle the same body across subs**

### Hard don'ts

- Don't sales-pitch
- Don't argue with haters
- Don't copy-paste the same comment everywhere
- Don't ignore subreddit rules
- Don't run more than 2 accounts solo

## Subreddit decisions for Notify

### `r/SideProject` — PRIMARY TARGET

- Paid apps allowed
- Links in body allowed
- Build stories thrive here
- Calibration from actual top posts: **"I built X" pattern dominates**, reactive hooks ("kept getting ads, so I built my own") perform best, time flex ("in a few hours/days") is sub-native, lifestyle-only hooks ("after dinner...") flop because the reader wants to know the build first
- Title rule for this sub: lead with the build, use case as the hook in second half

### `r/ClaudeAI` — BLOCKED until app has free tier

- Sub showcase rule: **"project must be free to try and say so"**
- Notify is $4.99 paid upfront with no free tier → does NOT qualify
- Posting there now risks removal AND ban (will burn 5 years of karma)
- Two paths to unlock:
  - Add a free tier (10 free pushes/day, or 7-day trial, or one-time IAP unlock for advanced features)
  - Skip this sub entirely, target paid-friendly ones
- If/when free tier exists: this sub is the highest-leverage Claude-specific audience and should go first

### Paid-friendly fallbacks

- `r/iOSProgramming` — technical build story, lean into APNs Critical Alert entitlement experience
- `r/cursor`, `r/ChatGPTCoding` — agent-finished alerts angle
- `r/swift`, `r/SwiftUI` — same as r/iOSProgramming
- `r/automation`, `r/n8n` — webhook destination angle
- `r/MacApps` — disclosure-flair required, $4.99 fine
- `r/HomeAutomation`, `r/homeassistant` — Critical Alerts breaking through Focus is the hook
- `r/selfhosted` — skeptical of closed-source iOS-only, position as honest comparison vs ntfy/Pushover/Gotify

### Posting cadence (paid-friendly subs only, until r/ClaudeAI unlocks)

| Week | Subreddit |
|------|-----------|
| 1 | r/SideProject (highest-leverage public launch) |
| 2 | r/iOSProgramming (technical credibility, APNs entitlement story) |
| 3 | r/HomeAutomation (different audience, Critical Alerts angle) |
| 4 | r/automation or r/n8n (webhook-destination framing) |
| 5+ | Whichever sub converted best, rotate the others |

## Best title for r/SideProject

**Primary:**
> Got tired of refreshing my dashboard 20 times a day. Built an iPhone push app so Claude could send me the recap after dinner instead.

Why it works: matches the proven "I kept getting ads for X so I built my own" reactive pattern. Has the relatable pain (every founder over-refreshes), the build, and the use case. The "20 times a day" is the concrete number.

**Alts:**
- "Built an iPhone push notification app in a few days. Now my Claude routine sends me my SaaS recap every night after dinner."
- "Built an iPhone push app in a few days. My Claude routine now pings me with my MRR + traffic every night after dinner."

## Best body for r/SideProject (paste-ready)

```
Set up two Claude Routines that run every evening at 8:55pm, right after dinner. One uses the Stripe MCP to pull revenue, the other uses a custom MCP for site traffic. Each Routine then curls my Notify webhook to push the result to my phone.

The push side I built myself in a few days with Claude Code. App is called Notify.

[Screenshot of the stacked lock-screen notifications]

💰 MRR Update
$11,960 total MRR
SaaS $4,280 · Apps $7,680
+12 trials · 3 new paid

📊 Site Traffic 24h
12,400 views · 3,180 unique
Top page: /pricing (28%)
+14% vs 7-day avg

For the revenue Routine I use the Stripe MCP. The prompt, roughly:

"Pull last 24h from Stripe: total MRR with breakdown by product (SaaS and Apps), new trials, new paid customers. Then POST to my Notify webhook URL with this JSON: title '💰 MRR Update', body in 3 short lines (total / breakdown / trials and new paid)."

Traffic Routine is the same pattern with a different MCP.

The actual curl the Routine fires:

curl -X POST https://push.tap-and-swipe.com/v1/send/$YOUR_WEBHOOK_TOKEN \
  -H "Content-Type: application/json" \
  -d '{"title":"💰 MRR Update","body":"$11,960 total MRR\nSaaS $4,280 · Apps $7,680\n+12 trials · 3 new paid"}'

Works with anything that can send HTTP. I mostly use it for Routines, scripts, and project alerts (deploy failed, agent finished, error spike), but it pairs fine with GitHub Actions, n8n, Home Assistant, whatever.

The build:
- SwiftUI iOS app
- Webhook URL generated on-device, secret in iCloud Keychain
- Server doesn't log message bodies, only routes to APNs
- Critical Alerts work for the wake-me-up cases (the entitlement adds a separate Apple review on top of the few days of coding)

$4.99 one-time on the App Store. No subscription, no usage caps.

https://apps.apple.com/app/notify-push-notifications/id6763496503

Open to questions about the build, the no-account architecture, or APNs gotchas.
```

## Image strategy

Every post needs proof images. r/SideProject is image-rich.

### r/SideProject gallery (3 images, in order)

1. **Hero**: lock-screen screenshot of the two stacked notifications (MRR + Site Traffic)
2. **App Store listing screenshot** — title, icon, $4.99 visible
3. Either the on-device webhook URL screen (proves "no account") OR the Routine config view in Claude (proves the workflow)

### Additional shots to keep on hand

- Lock screen with a Critical Alert breaking through Focus mode (use for r/HomeAutomation, r/iOSProgramming)
- A redacted screenshot of the entitlement / `.entitlements` file (use for r/iOSProgramming)
- Comparison matrix vs ntfy/Pushover/Gotify (use for r/selfhosted)

## Posting tips per sub

### r/SideProject

- Best time: weekday morning US time (Tue/Wed/Thu, 9-11am ET)
- First 2 hours = everything. Stay on the post and reply to every comment, even one-liners
- Pre-prepare answers for: "what stack?", "downloads so far?", "what's the backend?", "would you open source X?"
- Don't argue about pricing. Someone will say "$4.99 for that?". Respond honestly once and move on.

### r/iOSProgramming

- Lead with technical insight (APNs Critical Alert entitlement experience)
- Mention the app at the end, not the start
- Code samples (Swift, APNs payload JSON) drive credibility

### r/HomeAutomation

- Lead with the use case (leak sensor breaking through Focus at 3am)
- HA `shell_command` config block in the body
- Critical Alerts as the differentiator vs ntfy iOS

## Common rebuttals (already battle-tested)

| Question | Short answer |
|----------|--------------|
| "Why use Claude routines instead of a script?" | Convenience. Analytics shouldn't take much time and I never hit my Claude sub limits anyway. Once a flow works well I move it to a plain cron. Already have a few of those, plus webhooks for live stuff like new subs. |
| "Why not ntfy?" | iOS app feels second-class, no Critical Alert support |
| "Why not Pushover?" | Account required, paid tier for features I needed |
| "Why $4.99?" | One-time, no subscription, no usage caps. Covers Apple's cut + the APNs cost. |

## Discord-shareable Reddit playbook (for the user's community)

```
**Reddit marketing in 2 minutes**

Reddit is the 6th biggest site online, Google ranks it hard, every LLM scrapes it. One decent post pays you back for months.

**Warm the account first.** New account + promo = instant ban. Comment 5x/day for 2-3 weeks before you post anything. Get past 100 karma.

**Pick 5 subs max.** The ones where your audience already complains about the problem you solve. 10K-500K weekly visits is the sweet spot.

**Post structure.** Title = a real number or result, not vague pain. Body = Problem → Solution (be generous with the answer) → Proofs (screenshots, numbers) → "Questions? Happy to answer." Mention your product name once. Never put the link in the body, drop it in the first comment, anchored on a keyword.

**Formats that work**: detailed solution, tool list, honest autopsy, AMA, narrative.

**After you post.** First 5 minutes, grab a few upvotes. First 48h, reply to every comment, ignore haters, never argue. Steady state: 1 post per sub per week, never recycle the body.

**Don't**: pitch like a salesman, link in the post body, ghost comments, copy-paste across accounts, run more than 2 accounts solo.

Reddit hates promo, loves people who actually help. Lead with the problem, give the answer away, drop your name once.
```

## Humanize rules (avoid AI-sounding copy)

When writing or reviewing post copy, kill these patterns:

- **No em dashes** (—). Use commas, periods, or parentheses.
- **No "Here's the thing:"** or "It's not X, it's Y" formulaic openings
- **No "Happy to answer questions if needed"** generic sign-offs (be specific: "Open to questions about X, Y, Z")
- **No "Sharing in case it helps anyone here"** disclaimer openings
- **No decorative emojis** in body prose (emojis in notification examples are data, keep them)
- **Use contractions** (don't, I'm, won't)
- **Add voice/grumble**: "with coffee", "whatever you've got", "lol", "carried me through" — small markers signal a real person
- **Name real competitors** when relevant, vagueness is suspicious
- **Vary rhythm**: mix short fragments with longer sentences
- **Cut "Quality over quantity, always"** type clichés

Score before/after if drafting. Aim for 95+ on the humanize scale.

## Things I should NOT do (learned from this conv)

- **Don't lead with competitor-bashing in the hook** ("existing tools sucked, so I built mine"). Defensive, low-conversion. Lead with story/moment instead.
- **Don't put "$4.99" in the title** for r/SideProject. Pricing in body. Title flexing pricing read poorly in actual top posts there.
- **Don't put "iOS" or "Notify" in the title** unless required. Keep it for the body reveal.
- **Don't claim "free to try" anywhere** unless app actually has a free tier.
- **Don't use 9am morning recap framing on r/SideProject**. The build is the lead, the moment is the hook in second half.
- **Don't use lifestyle-only titles** ("After dinner...") on r/SideProject. The reader wants to know what was built.

## Open questions to resolve

- Add a free tier to unlock r/ClaudeAI? Strongly recommended.
- Final stack disclosure when asked: SwiftUI confirmed, but server stack (Cloudflare Worker / Next.js / etc) — don't claim a specific one in the post until verified
- App Store review download numbers — fill in real numbers if available before posting
- Real screenshots vs mocked: take real morning Routine screenshots before posting, much higher credibility than fabricated numbers
