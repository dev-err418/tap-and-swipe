# Monday weekly digest — last 7 days, one combined notification

You have access to the `tap-and-swipe` MCP. Run the three summary tools in parallel:

- `newsletter_summary` with `dateRange="7d"`
- `community_summary` with `dateRange="7d"`
- `quiz_summary` with `dateRange="7d"`

Send exactly one push notification via this endpoint (POST, JSON body):

```
https://push.tap-and-swipe.com/v1/send/y4jjdbZdt9_iERsPrNBXfg
```

Body shape:

- `title`: `"Weekly digest"`
- `subtitle`: `"<period start MM-DD> to <period end MM-DD>"` derived from `range.from` / `range.to` of any of the results
- `body`: three lines, one per product, each shaped like `"<emoji> <product>: <views>v / <conv>c / <cr>% CR · WoW <viewsChange>% / <convChange>%"` where:
  - Newsletter: emoji `📰`, conv = `signups.value`, convChange = `signups.change`
  - Community: emoji `🏛️`, conv = `paid.value`, convChange = `paid.change`
  - Quiz: emoji `❓`, conv = `leads.value`, convChange = `leads.change` (and CR is `completionRate`)
  - Round CRs to 1 decimal; format WoW changes with sign (`+12.3%` / `-4.0%`); show `—` if null
- `interruption_level`: `"passive"`

Hard limits: `subtitle` ≤ 200 chars, `body` ≤ 2000 chars.

If any MCP tool errors, still send the digest with that line replaced by `"<emoji> <product>: failed"`.

Stop after sending. Do not write files, do not summarize back.
