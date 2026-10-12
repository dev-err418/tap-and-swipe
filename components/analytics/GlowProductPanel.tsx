import type { GlowCancellationReport, GlowProductReport } from "@/lib/glow-product-analytics";
import { DashboardCard } from "@/components/analytics/DashboardCard";

function number(value: number) { return value.toLocaleString("en-US"); }
function percent(value: number | null) { return value === null ? "—" : `${(value * 100).toFixed(1)}%`; }
function duration(value: number | null) { return value === null ? "—" : value >= 60 ? `${(value / 60).toFixed(1)} min` : `${Math.round(value)} sec`; }
function date(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function sourceLabel(source: string) {
  return ({ onboarding: "Onboarding", reminder_sheet: "Reminder sheet", home_widget_sheet: "Home widget sheet", settings: "Settings", unattributed: "No recent prompt" } as Record<string, string>)[source]
    ?? source.replaceAll("_", " ");
}

export default function GlowProductPanel({ report, appName = "Glow" }: { report: GlowProductReport | null; appName?: "Glow" | "Versy" }) {
  if (!report) return null;
  return (
    <div className="space-y-4">
      <DashboardCard title={`${appName} product use`} action={<span className="text-xs text-muted-foreground">PostHog · native app</span>}>
        {report.status === "setup_required" || report.status === "unavailable" ? (
          <p role="status" className="py-5 text-sm text-muted-foreground">{report.note}</p>
        ) : report.status === "empty" ? (
          <p role="status" className="py-5 text-sm text-muted-foreground">Waiting for the instrumented native release to send production events.</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Metric label="Notification allow rate" value={percent(report.notifications.allowRate)}
                detail={`${number(report.notifications.allowedUsers)} allowed / ${number(report.notifications.resolvedUsers)} answered the iOS prompt`} />
              <Metric label="iOS permission allowed" value={percent(report.notifications.observedAllowRate)}
                detail={`${number(report.notifications.observedAllowedUsers)} of ${number(report.notifications.observedDecidedUsers)} users with a latest allow/deny decision`} />
              <Metric label={`${appName} reminders enabled`} value={percent(report.notifications.remindersEnabledRate)}
                detail={`${number(report.notifications.remindersEnabledUsers)} of ${number(report.notifications.observedUsers)} users with a state snapshot`} />
              <Metric label="Seen with a widget" value={percent(report.widgets.seenInstalledRate)}
                detail={`${number(report.widgets.seenInstalledUsers)} of ${number(report.widgets.checkedUsers)} checked users in this period`} />
              <Metric label="Detected widget adds" value={number(report.widgets.detectedAdds)}
                detail="Absent → installed while tracking was active" />
              <Metric label="Linked cancellations"
                value={`${number(report.cancellations.matchedCount + report.paidCancellations.matchedCount)} / ${number(report.cancellations.recentCount + report.paidCancellations.recentCount)}`}
                detail={`Trial ${number(report.cancellations.matchedCount)}/${number(report.cancellations.recentCount)} · paid ${number(report.paidCancellations.matchedCount)}/${number(report.paidCancellations.recentCount)}`} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Notification allow rate uses first permission answers. The other notification figures use each user’s latest app snapshot in the period. Widget prevalence is users seen with a widget during the selected period, not an install conversion rate.
              Widget prompt source is inferred from the most recent invitation within 24 hours.
            </p>
          </>
        )}
      </DashboardCard>

      {report.status === "ready" ? (
        <DashboardCard title={`${appName === "Versy" ? "Verse" : "Quote"} reading sessions`} action={<span className="text-xs text-muted-foreground">Completed feed visits</span>}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label={`People who viewed ${appName === "Versy" ? "verses" : "quotes"}`} value={number(report.reading.users)} detail={`${number(report.reading.sessions)} tracked sessions`} />
            <Metric label={`${appName === "Versy" ? "Verses" : "Quotes"} viewed / session`} value={report.reading.quoteViewsPerSession?.toFixed(1) ?? "—"} detail="Visible pages per completed feed visit" />
            <Metric label="Swipes / session" value={report.reading.swipesPerSession?.toFixed(1) ?? "—"} detail="Quote page changes per completed feed visit" />
            <Metric label="Time / session" value={duration(report.reading.secondsPerSession)} detail="Average completed feed visit" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Saved quotes: {report.favorites.averageSaved?.toFixed(1) ?? "—"} per observed user;
            {" "}{percent(report.favorites.adoptionRate)} have at least one ({number(report.favorites.observedUsers)} users with a recent app snapshot).
          </p>
        </DashboardCard>
      ) : null}

      {report.status === "ready" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <DashboardCard title="What people use most" action={<span className="text-xs text-muted-foreground">Unique users · actions per active user</span>}>
            <div className="space-y-2">
              {report.features.filter((feature) => feature.users > 0).map((feature) => (
                <div key={feature.event} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 text-sm">
                  <span className="truncate text-black/75">{feature.label}</span>
                  <span className="font-medium tabular-nums">{number(feature.users)} users</span>
                  <span className="w-24 text-right tabular-nums text-muted-foreground">{feature.eventsPerUser?.toFixed(1) ?? "—"} / user</span>
                </div>
              ))}
              {report.features.every((feature) => feature.users === 0) && <p className="text-sm text-muted-foreground">No feature events yet.</p>}
            </div>
          </DashboardCard>

          <DashboardCard title="Prompts before a widget add" action={<span className="text-xs text-muted-foreground">Inferred last prompt</span>}>
            <div className="space-y-2">
              {report.widgets.sources.map((source) => (
                <div key={source.source} className="flex justify-between gap-4 text-sm">
                  <span className="text-black/75">{sourceLabel(source.source)}</span>
                  <span className="font-medium tabular-nums">{number(source.users)} adds · {number(source.promptedUsers)} saw prompt</span>
                </div>
              ))}
              {report.widgets.sources.length === 0 && <p className="text-sm text-muted-foreground">No new widget adds detected yet.</p>}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Add source is inferred from the latest prompt within 24 hours. These are not conversion rates: iOS does not reveal which prompt caused installation.</p>
          </DashboardCard>
        </div>
      ) : null}

      {report.status === "ready" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <DashboardCard title="Screens people spend time on" action={<span className="text-xs text-muted-foreground">Average tracked time per user</span>}>
            <div className="space-y-2">
              {report.screens.slice(0, 8).map((screen) => (
                <div key={screen.screen} className="flex justify-between gap-3 text-sm">
                  <span className="text-black/75">{screen.screen.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ")}</span>
                  <span className="tabular-nums">{duration(screen.secondsPerUser)} · {number(screen.users)} users</span>
                </div>
              ))}
              {report.screens.length === 0 && <p className="text-sm text-muted-foreground">No screen duration events yet.</p>}
            </div>
          </DashboardCard>
          <DashboardCard title="Categories selected" action={<span className="text-xs text-muted-foreground">Users seen with each selection</span>}>
            <div className="space-y-2">
              {report.categories.slice(0, 8).map((category) => (
                <div key={category.category} className="flex justify-between gap-3 text-sm">
                  <span className="text-black/75">{category.category.replaceAll("_", " ")}</span>
                  <span className="font-medium tabular-nums">{number(category.users)} users</span>
                </div>
              ))}
              {report.categories.length === 0 && <p className="text-sm text-muted-foreground">No category snapshots yet.</p>}
            </div>
          </DashboardCard>
        </div>
      ) : null}

      {report.status === "ready" ? (
        <DashboardCard title="What people use by access phase" action={<span className="text-xs text-muted-foreground">Phase at the time of each action</span>}>
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {report.premiumUse.map((cohort) => (
              <div key={cohort.status}>
                <h4 className="mb-2 text-sm font-semibold">{{ trial: "Trial", paid: "Paid", free: "Free", unknown: "Unknown" }[cohort.status]}</h4>
                <div className="space-y-1.5">
                  {cohort.features.filter((feature) => feature.users > 0).slice(0, 6).map((feature) => (
                    <div key={feature.event} className="flex justify-between gap-3 text-xs">
                      <span>{feature.label}</span><span className="tabular-nums">{number(feature.users)} users · {feature.eventsPerUser?.toFixed(1)} / user</span>
                    </div>
                  ))}
                  {cohort.features.every((feature) => feature.users === 0) && <p className="text-xs text-muted-foreground">No events yet.</p>}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">A user can appear in multiple phases over time. Unknown includes Superwall access without a verified StoreKit transaction and events before phase tracking began.</p>
        </DashboardCard>
      ) : null}

      {report.status === "ready" ? (
        <DashboardCard title="Early trial use and later cancellation" action={<span className="text-xs text-muted-foreground">First 12h use · cancellation in hours 12–72</span>}>
          {report.trialComparison.status === "ready" ? <>
            <p className="mb-3 text-xs text-muted-foreground">
              {number(report.trialComparison.matchedCancelled)} cancelled and {number(report.trialComparison.matchedContinued)} did not cancel within 72 hours. Compared only within the same trial start week and product. {number(report.trialComparison.earlyCancelled)} people who cancelled in the first 12 hours were excluded. This is an association, not a causal test.
            </p>
            <div className="space-y-2">
              {report.trialComparison.features.map((feature) => (
                <div key={feature.event} className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 text-xs">
                  <span className="truncate">{feature.label}</span>
                  <span className="tabular-nums">Cancelled {percent(feature.cancelledAdoption)}</span>
                  <span className="tabular-nums">Continued {percent(feature.continuedAdoption)}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Percentages show the share who tried each feature at least once in their first 12 hours. The 72 hour outcome means no cancellation was observed by then, not that a subscription was ultimately retained.</p>
          </> : <p className="text-sm text-muted-foreground">
            {report.trialComparison.status === "truncated" ? "The trial sample exceeded the safe query limit; widen the data pipeline before interpreting this comparison."
              : report.trialComparison.status === "unavailable" ? "The trial comparison is temporarily unavailable."
                : `Waiting for comparable mature trial starts. ${number(report.trialComparison.eligibleStarts)} eligible starts observed.`}
          </p>}
        </DashboardCard>
      ) : null}

      {report.status === "ready" ? (
        <DashboardCard title="Reasons people shared" action={<span className="text-xs text-muted-foreground">Optional Settings feedback</span>}>
          {report.feedback.length ? <div className="flex flex-wrap gap-2">
            {report.feedback.map((item) => <span key={item.reason} className="rounded-full bg-black/[0.05] px-3 py-1 text-xs text-black/70">
              {item.reason.replaceAll("_", " ")}: {number(item.users)}
            </span>)}
          </div> : <p className="text-sm text-muted-foreground">No subscription feedback submitted in this period.</p>}
          <p className="mt-3 text-xs text-muted-foreground">This is an optional self report from people who opened the feedback sheet. It is not a representative cancellation survey.</p>
        </DashboardCard>
      ) : null}

      {report.status === "ready" ? <WinbackPanel features={report.features} /> : null}
      {report.status === "ready" ? <CancellationPanel kind="trial" report={report.cancellations} /> : null}
      {report.status === "ready" ? <CancellationPanel kind="paid" report={report.paidCancellations} /> : null}
    </div>
  );
}

function WinbackPanel({ features }: { features: GlowProductReport["features"] }) {
  const count = (event: string) => features.find((feature) => feature.event === event);
  const sent = count("winback_notification_sent");
  const opened = count("winback_notification_opened");
  const viewed = count("winback_paywall_viewed");
  const purchased = count("winback_purchase_completed");
  return <DashboardCard title="Win-back after cancellation" action={<span className="text-xs text-muted-foreground">Half-price yearly offer</span>}>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Notifications sent" value={number(sent?.events ?? 0)} detail={`${number(sent?.users ?? 0)} people`} />
      <Metric label="Opened" value={number(opened?.events ?? 0)} detail={`${number(opened?.users ?? 0)} people`} />
      <Metric label="Saw the offer" value={number(viewed?.events ?? 0)} detail={`${number(viewed?.users ?? 0)} people`} />
      <Metric label="Bought the yearly" value={number(purchased?.events ?? 0)} detail={`${number(purchased?.users ?? 0)} people`} />
    </div>
    <p className="mt-3 text-xs text-muted-foreground">
      Sent is recorded when Apple accepts the push. Opened, the offer sheet, and the purchase are recorded in the app. Debug opens are excluded from production.
    </p>
  </DashboardCard>;
}

function CancellationPanel({ kind, report }: { kind: "trial" | "paid"; report: GlowCancellationReport }) {
  return <DashboardCard title={`Before ${kind === "trial" ? "trial" : "paid subscription"} cancellation`}
    action={<span className="text-xs text-muted-foreground">25 most recent · prior 7 days</span>}>
    {report.recentCount === 0 ? <p className="text-sm text-muted-foreground">No {kind} cancellations in this period yet.</p> : (
      <div className="space-y-5">
        <p className="text-xs text-muted-foreground">
          {number(report.matchedCount)} of {number(report.recentCount)} recent {kind} cancellations have linked production app events.
          Missing journeys may be older builds, analytics opt-outs, or unmatched Superwall IDs. Prior activity shows association, not a user supplied reason.
        </p>
        {report.topPriorActions.length > 0 && <div className="flex flex-wrap gap-2">
          {report.topPriorActions.slice(0, 6).map((feature) => (
            <span key={feature.event} className="rounded-full bg-black/[0.05] px-3 py-1 text-xs text-black/70">
              {feature.label}: {number(feature.users)} users
            </span>
          ))}
        </div>}
        <div className="divide-y divide-black/[0.07]">
          {report.journeys.map((journey) => <details key={`${journey.user}-${journey.cancelledAt}`} className="group py-3">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">User {journey.user} · cancelled {date(journey.cancelledAt)}</span>
              <span className="text-muted-foreground">{journey.activity.length ? journey.activity.slice(0, 3).map((item) => `${item.label} ${item.count}`).join(" · ") : "No linked app activity"}</span>
            </summary>
            <div className="mt-3 grid gap-4 text-xs sm:grid-cols-2">
              <div className="space-y-1.5 text-muted-foreground">
                <p>Superwall reason: {journey.reason ?? "Unavailable"}</p>
                <p>Reason shared in app: {journey.selfReportedReason?.replaceAll("_", " ") ?? "Not shared"}</p>
                {kind === "trial" ? <p>Trial started: {journey.trialStartedAt ? date(journey.trialStartedAt) : "Not linked"}</p> : null}
                <p>Last app activity: {journey.lastAppActivityAt ? date(journey.lastAppActivityAt) : "Not linked"}</p>
                {journey.lastAppVersion ? <p>Last app version: {journey.lastAppVersion}</p> : null}
              </div>
              <ol className="space-y-1.5">
                {journey.recentActions.map((action, index) => <li key={`${action.at}-${index}`} className="flex justify-between gap-3">
                  <span>{action.label}</span><time className="shrink-0 text-muted-foreground">{date(action.at)}</time>
                </li>)}
              </ol>
            </div>
          </details>)}
        </div>
      </div>
    )}
  </DashboardCard>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-2xl bg-black/[0.035] p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
    <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
  </div>;
}
