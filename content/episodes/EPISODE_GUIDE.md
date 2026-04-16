# Episode Writing Guide

How to structure Tap & Swipe episode articles for both readers and AI citation engines (Google AI Overviews, ChatGPT, Perplexity).

## File location

Each episode is a single MDX file at `content/episodes/{slug}.mdx`.

## Frontmatter

```yaml
---
title: "Headline — clickable, specific, includes a number"
description: "1-2 sentence summary. Include the guest name, app name, key metric."
date: "YYYY-MM-DD"
guest: "Full Name"
guestInfo:
  name: "Full Name"
  photo: "/guests/slug.webp"
  role: "Title or descriptor"
  twitter: "https://x.com/handle"
  linkedin: "https://www.linkedin.com/in/handle"
  threads: "https://www.threads.com/@handle"    # optional
  mastodon: "https://mastodon.social/@handle"   # optional
  website: "https://example.com"                # optional
tags: ["keyword1", "keyword2"]
appStoreId: "1234567890"    # triggers App Store badge
playStoreId: "com.example"  # triggers Play Store badge
image: "/episodes/slug.webp"
imageAlt: "Descriptive alt text"
---
```

## Article structure

### 1. Title block

```markdown
# Guest Name, App Name

**One-liner about who they are and what they do.**
**Key stat. Standout detail.**
```

Two bold lines: first describes the person, second drops the hook (revenue, unique angle, etc.).

### 2. TL;DR

```markdown
**TL;DR:** 2-3 sentences answering "what is this episode about?" Include the guest's full name, the app name, the key revenue number, and how they got there.
```

This is the passage AI engines will most likely cite. Keep it factual and self-contained. Someone reading only this block should understand the story.

### 3. Watch/listen link

```markdown
[Watch the full episode →](#)
```

Replace `#` with the actual YouTube/podcast link when available.

### 4. Main sections (h2s as questions)

Every h2 should be a question a reader (or AI) might search for. This is the core SEO/GEO pattern.

| Section purpose | Heading format | Example |
|----------------|----------------|---------|
| Who is the guest | `## Who is [Full Name]?` | `## Who is Aleksei Rozhnov?` |
| What's the app | `## What is [App Name]?` | `## What is Evelize?` |
| Revenue/metrics | `## How much does [App] make?` | `## How much does Evelize make?` |
| Market/competition | `## How competitive is the [niche] market?` | `## How competitive is the teleprompter app market?` |
| Lessons/takes | `## What did [Name] learn building [context]?` | `## What did Aleksei learn building a side project?` |
| Full episode CTA | `## Where can I hear the full episode?` | (always the same) |

**Important:** The "What is [App Name]?" heading triggers the `<AppShowcase />` component (app store badges, screenshots). The page component detects h2s starting with "What is" to render this. Don't change this pattern.

### 5. Founder card

Place `<FounderCard />` right after the first h2 ("Who is...?"). This renders the guest's photo, name, role, and social links from the frontmatter `guestInfo`.

### 6. Answer-first paragraphs

Start each section with a direct answer to the heading's question, not backstory.

Bad: "Growing up in a small town, Aleksei always loved computers..."
Good: "Aleksei Rozhnov is a backend engineer at a trading firm in London who builds a $17K/month app on the side."

The first sentence should work as a standalone answer if extracted by an AI.

### 7. Source attribution

Add podcast attribution to key stats so AI engines can cite the source:

```markdown
Evelize generated **$17,000 in the last 30 days** across both platforms, as Aleksei shared on the Tap & Swipe podcast (April 2026).
```

You don't need attribution on every sentence. Once or twice per article on the most important numbers is enough.

### 8. Blockquotes for best lines

Pull the guest's best one-liners into `>` blockquotes. These are highly citable by AI engines and stand out visually.

```markdown
> "Product is okay. Often product doesn't even matter that much. Distribution is the game."
```

Keep surrounding text to provide context. Don't blockquote generic statements — pick lines that are opinionated, specific, or surprising.

### 9. Bold key stats

Bold the most important numbers so they're visually scannable and easily extractable:

```markdown
**$17K/month split between two founders**, minus ad spend and taxes
```

### 10. Sub-sections (h3s)

Under the "What did [Name] learn..." section, use h3s for individual takes. Direct quotes as headings work well here:

```markdown
### "Marketing is a pseudo-science"
### The math on quitting doesn't work yet
### Google Ads can just run for years
```

### 11. Closing section

Always end with `## Where can I hear the full episode?` followed by a teaser of topics not covered in the article, then a link.

## Horizontal rules

Use `---` between major sections (between each h2 block). This creates visual breathing room.

## Voice

- Write like you're telling a friend about the conversation you just had
- Short sentences. Fragments are fine.
- No corporate speak, no "leveraging" or "showcasing"
- Keep the guest's actual words in quotes or blockquotes
- Be specific, not vague ("$17K/month" not "significant revenue")
- Opinions welcome ("He hated most of it" not "He found the experience challenging")

## Technical notes

- The `slugify` function in `app/(site)/episodes/[slug]/page.tsx` generates heading IDs from the text: lowercase, strip special chars, replace spaces with hyphens. These IDs power the sidebar table of contents.
- The `extractToc` function in `lib/toc.ts` parses h2 and h3 headings from the raw markdown to build the TOC.
- The `<AppShowcase />` component renders below any h2 that starts with "What is" (case-insensitive). It uses the `appStoreId` and `playStoreId` from frontmatter to show app store badges.
