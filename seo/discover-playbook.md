# Google Discover Playbook

The technical scaffolding lives in code (Article schema, `max-image-preview:large`, the readiness check at publish time). This file is the operational half: how to choose titles and images so an article is actually picked up by the feed.

## How Discover decides

Discover is not search. Users are not typing a query. The feed picks cards from a personalized interest graph built off Chrome history and follows. Distribution depends on three signals:

1. **Title.** Stops the scroll or doesn't.
2. **Image.** Stops the scroll or doesn't.
3. **Audience traction.** Did past readers click and stay? Returning readers compound; thin engagement on a recent article drags down the next one.

The technical floor (indexable, mobile, fast, large image, structured data) gets you eligibility. None of that increases distribution on its own.

## Headline rules

Keep titles ≤90 characters or they get truncated on mobile. The readiness check warns past that.

What works:
- Lead with a person, a specific number, or a counterintuitive claim.
- "I" / "we" / a named founder beats abstract framing.
- A concrete outcome ("$20K MRR", "in 30 days", "after 3 failed apps") beats a generic promise.
- One emotion + one promise. Curiosity > description.

What doesn't:
- Generic listicles ("5 Tips for...").
- SEO-style "Best X for Y" titles. Those win search, lose Discover.
- Brand-first titles ("Tap & Swipe announces...").

Examples in the right shape:
- "I rewrote my $5K/month app from scratch. Here's what broke."
- "How Aleksei went from zero to $20K MRR in 8 months with one app"
- "The 30-day window that decides whether your app survives launch"

## Image rules

Hard floor (enforced by the readiness check):
- ≥1200px wide.
- A real file under `public/`, declared in frontmatter as `image:` with a non-trivial `imageAlt:`.

Soft rules (judgment):
- Use a face when one is available. Faces outperform abstract shots on Discover by a wide margin.
- App screenshots > stock photos. Generic stock images underperform across every category.
- High contrast, single subject. The thumbnail is small in the feed.
- WebP, ~50KB. Quality matters, file size also matters.
- Don't reuse the same image across articles. Discover compares freshness signals.

When you publish, paste the live URL into https://search.google.com/test/rich-results and confirm the Article schema is detected and the image renders.

## Freshness

Discover decays old articles fast. If an article gets meaningful updates (new numbers, a new section, a corrected claim), bump `updatedDate:` in the frontmatter. The Article schema's `dateModified` reads from it. Don't bump it for cosmetic edits, that just teaches the algorithm to distrust the signal.

## Cadence over volume

Publishing more dilutes per-article engagement. The algorithm averages signals across the site, so adding low-traction articles lowers what Google is willing to push for the high-traction ones. Fewer, sharper articles outperform daily volume.

Practical default: ship one well-engineered article per week, not seven mediocre ones.

## After publishing

Discover is passive. There is no submission and no fast feedback loop:

- Google Search Console > Performance > **Discover** tab. Only appears once Google has impression data, usually a few days to a few weeks after the article goes live.
- Use **URL Inspection** to confirm the page is indexed and Google sees the Article schema.
- IndexNow ping (`scripts/indexnow.ts`) speeds up indexing but does not influence Discover.

If an article gets no Discover impressions after 2–3 weeks, the article was not interesting to Google's interest graph. Don't tweak the same article, ship the next one with a sharper title and image.
