# Daily morning push — last 24h, one notification per product

You have access to the `tap-and-swipe` MCP. Run the three summary tools in parallel:

- `newsletter_summary` with `dateRange="1d"`
- `community_summary` with `dateRange="1d"`
- `quiz_summary` with `dateRange="1d"`

For each result, call the `notify_send` MCP tool exactly once with the fields below. Do not POST to any external URL — `notify_send` is the only allowed delivery path.

**Newsletter** (from `newsletter_summary`)
- `title`: `"Newsletter — last 24h"`
- `subtitle`: `"<views.value> views · <signups.value> subs · <cr>% CR"`
- `body`: line 1 `"Top: <topCountry.label> · <topReferrer.label>"`, line 2 `"<signups.change>% WoW signups, <views.change>% WoW views"`. If a top* is null, write `"—"`. If `change` is null, omit that half of line 2.
- `interruption_level`: `"passive"`
- `thread_id`: `"daily-newsletter"`

**Community** (from `community_summary`)
- `title`: `"Community — last 24h"`
- `subtitle`: `"<views.value> views · <paid.value> paid · <cr>% CR"`
- `body`: line 1 `"Top: <topCountry.label> · <topReferrer.label>"`, line 2 `"CTAs: <ctaClicked.value> · <paid.change>% WoW paid"`
- `interruption_level`: `"passive"`
- `thread_id`: `"daily-community"`

**Quiz** (from `quiz_summary`)
- `title`: `"Quiz — last 24h"`
- `subtitle`: `"<views.value> views · <leads.value> leads · <completionRate>% complete"`
- `body`: line 1 `"Top: <topCountry.label> · <topReferrer.label>"`, line 2 `"Routes: <leadsByRoute.coaching> coach / <leadsByRoute.community> comm"`
- `interruption_level`: `"passive"`
- `thread_id`: `"daily-quiz"`

Round CR percentages to 1 decimal. Negative WoW changes show as `-12.3%`; positive as `+12.3%`.

If any summary tool errors, skip its push and call `notify_send` once with `title="Daily summary failed"`, `subtitle=<failed tool name>`, `body=<short error>`, `interruption_level="active"`.

Stop after sending. Do not write files, do not summarize back.
