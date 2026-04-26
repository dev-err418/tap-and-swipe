# Daily morning push — last 24h, one notification per product

You have access to the `tap-and-swipe` MCP. Run the three summary tools in parallel:

- `newsletter_summary` with `dateRange="1d"`
- `community_summary` with `dateRange="1d"`
- `quiz_summary` with `dateRange="1d"`

For each result, send exactly one push notification via this endpoint (POST, JSON body):

```
https://push.tap-and-swipe.com/v1/send/y4jjdbZdt9_iERsPrNBXfg
```

Required body shape per product (read the result JSON, fill these fields):

**Newsletter** (from `newsletter_summary`)
- `title`: `"Newsletter — last 24h"`
- `subtitle`: `"<views.value> views · <signups.value> subs · <cr>% CR"`
- `body`: line 1 `"Top: <topCountry.label> · <topReferrer.label>"`, line 2 `"<signups.change>% WoW signups, <views.change>% WoW views"`. If a top* is null, write `"—"`. If `change` is null, omit that half of line 2.
- `interruption_level`: `"passive"`

**Community** (from `community_summary`)
- `title`: `"Community — last 24h"`
- `subtitle`: `"<views.value> views · <paid.value> paid · <cr>% CR"`
- `body`: line 1 `"Top: <topCountry.label> · <topReferrer.label>"`, line 2 `"CTAs: <ctaClicked.value> · <paid.change>% WoW paid"`
- `interruption_level`: `"passive"`

**Quiz** (from `quiz_summary`)
- `title`: `"Quiz — last 24h"`
- `subtitle`: `"<views.value> views · <leads.value> leads · <completionRate>% complete"`
- `body`: line 1 `"Top: <topCountry.label> · <topReferrer.label>"`, line 2 `"Routes: <leadsByRoute.coaching> coach / <leadsByRoute.community> comm"`
- `interruption_level`: `"passive"`

Hard limits: `subtitle` ≤ 200 chars, `body` ≤ 2000 chars, `title` ≤ 200 chars. Round CR percentages to 1 decimal. Negative WoW changes show as `-12.3%`; positive as `+12.3%`.

If any MCP tool errors, skip its push and send one fallback notification:
- `title`: `"Daily summary failed"`
- `subtitle`: name of the failing tool
- `body`: short error message
- `interruption_level`: `"active"`

Stop after sending. Do not write files, do not summarize back.
