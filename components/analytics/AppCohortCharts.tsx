"use client";

import {
  Bar, CartesianGrid, ComposedChart, Line, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { APP_ANALYTICS_TIME_ZONE } from "@/lib/app-analytics-time";
import {
  overviewDailyPoints, overviewBucket, overviewBucketHours,
  type AppOverviewTrend, type OverviewPeriod,
} from "@/lib/app-overview-cohorts";
import {
  ChartNoteButton, ChartTooltip, TooltipMetric, LegendItem, NoteMarker, RoundedRevenueBar,
  type AnalyticsChartNote,
} from "./AppSprintFunnelCharts";

type PlotPoint = ReturnType<typeof overviewDailyPoints>[number] & { timestamp: number };
const INSTALL_COLOR = "#f97316";
const APPU_COLOR = "#1d4ed8";

export default function AppCohortCharts({ report, notes, onNoteClick, onAddNote, installLabel = "Installs" }: {
  report: AppOverviewTrend | null;
  installLabel?: string;
  notes: AnalyticsChartNote[];
  onNoteClick: (note: AnalyticsChartNote) => void;
  onAddNote: (date: string) => void;
}) {
  const points: PlotPoint[] = (report ? overviewDailyPoints(report) : []).map((point) => ({
    ...point,
    timestamp: Date.parse(point.date),
  }));
  const first = points[0]?.timestamp;
  const last = points.at(-1)?.timestamp;
  const period = report?.period ?? "month";
  const bucketHours = overviewBucketHours(period);
  const step = bucketHours * 3_600_000;
  const domain: [number, number] = first == null || last == null
    ? [0, 1] : [first - step / 2, last + step / 2];
  // Daily endpoints keep each segment flat all the way to midnight, including
  // single-point days and the last interval before a day with no APPU data.
  const dailyLine = [...new Map(points.map((point) => [point.dayStartMs, point])).values()]
    .flatMap((point) => [
      { timestamp: Math.max(domain[0], point.dayStartMs), appu: point.appu },
      { timestamp: Math.min(domain[1], point.dayEndMs), appu: point.appu },
    ]);
  if (dailyLine.length > 0) dailyLine[0].timestamp = domain[0];
  const visibleNotes = notes.filter((note) => report
    && Date.parse(note.notedAt) >= report.startMs && Date.parse(note.notedAt) < report.endMs);
  const appuValues = points.flatMap((point) => point.appu == null ? [] : [point.appu]);
  const appuDomain: [number, number] = [
    Math.floor(Math.min(0, ...appuValues) * 2) / 2,
    Math.ceil(Math.max(1, ...appuValues) * 2) / 2,
  ];

  return (
    <div>
      <div aria-label="Chart legend" className="mb-3 flex flex-wrap items-center justify-center gap-2 text-[11px]">
        <LegendItem color={INSTALL_COLOR} label={installLabel} />
        <LegendItem color={APPU_COLOR} label="APPU · daily average" />
        {visibleNotes.length > 0 ? <LegendItem color="#7c3aed" label="Notes" /> : null}
      </div>
      <div className="h-80 w-full text-xs sm:h-96" aria-label="Installs and APPU by install date">
        {points.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} accessibilityLayer margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid yAxisId="installs" vertical={false} stroke="#000000" strokeOpacity={0.055} />
              <XAxis
                dataKey="timestamp" type="number" scale="time" domain={domain}
                ticks={points.length === 1 ? [first!] : undefined}
                tickFormatter={(value: number) => formatDate(value, period)}
                tickLine={false} axisLine={false} minTickGap={36} tickMargin={10}
                height={32} tick={{ fill: "#888", fontSize: 11 }}
              />
              <XAxis xAxisId="daily-appu" dataKey="timestamp" type="number" scale="time" domain={domain} hide />
              <YAxis
                yAxisId="installs" width={42} tickLine={false} axisLine={false}
                tick={{ fill: "#888", fontSize: 11 }} tickCount={5}
                domain={[0, "auto"]} allowDecimals={false}
                tickFormatter={(value: number) => new Intl.NumberFormat("en-US", { notation: "compact" }).format(value)}
              />
              <YAxis
                yAxisId="appu" orientation="right" width={56} tickLine={false} axisLine={false}
                tick={{ fill: "#888", fontSize: 11 }} tickCount={5} domain={appuDomain}
                tickFormatter={(value: number) => formatCurrency(value)}
              />
              <Tooltip
                filterNull={false} cursor={{ stroke: "#000", strokeOpacity: 0.12, strokeDasharray: "3 3" }}
                content={({ active, payload }) => (
                  <CohortTooltip active={active} point={payload?.[0]?.payload as PlotPoint | undefined}
                    available={Boolean(report?.available)} notes={visibleNotes} report={report} installLabel={installLabel} />
                )}
              />
              <Bar yAxisId="installs" dataKey="installs" name={installLabel} fill={INSTALL_COLOR}
                shape={<RoundedRevenueBar />} maxBarSize={34} isAnimationActive={false} />
              <Line xAxisId="daily-appu" yAxisId="appu" data={dailyLine} dataKey="appu" name="APPU · daily average" type="stepAfter"
                stroke={APPU_COLOR} strokeWidth={2.5} dot={false} activeDot={false}
                connectNulls={false} isAnimationActive={false} />
              {visibleNotes.map((note) => (
                <ReferenceLine key={note.id} yAxisId="installs"
                  x={overviewBucket(new Date(note.notedAt), period).getTime()}
                  stroke="#7c3aed" strokeDasharray="4 4" strokeWidth={1.5}
                  zIndex={500} label={<NoteMarker note={note} onClick={onNoteClick} />} />
              ))}
              <ChartNoteButton points={points} onAddNote={onAddNote} timeZone={APP_ANALYTICS_TIME_ZONE} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : <p role="status" className="flex h-full items-center justify-center text-sm text-black/45">Cohort data unavailable</p>}
      </div>
      <p className="mt-3 px-1 text-[11px] leading-relaxed text-black/45">
        {bucketHours === 1 ? "Hourly" : bucketHours === 4 ? "Four-hour" : "Daily"} installs · APPU shows each day’s average, using net proceeds through today per tracked install, including non-payers.
      </p>
      {!report?.available ? <p role="status" className="mt-1 px-1 text-[11px] text-black/45">Cohort data unavailable. Install totals remain visible.</p> : null}
      {report?.available && appuValues.length === 0 ? <p role="status" className="mt-1 px-1 text-[11px] text-black/45">{report.total?.missingMoney > 0 ? "APPU unavailable: proceeds data is incomplete." : "No tracked installs yet."}</p> : null}
    </div>
  );
}

function CohortTooltip({ active, point, available, notes, report, installLabel }: {
  active?: boolean;
  point?: PlotPoint;
  available: boolean;
  notes: AnalyticsChartNote[];
  report: AppOverviewTrend | null;
  installLabel: string;
}) {
  if (!active || !point) return null;
  const total = point.dailyTotal;
  const appuLabel = point.appu === null ? "—" : formatCurrency(point.appu);
  const noteMatches = report ? notes.filter((note) =>
    overviewBucket(new Date(note.notedAt), report.period).getTime() === point.timestamp) : [];
  return (
    <ChartTooltip date={point.timestamp} timeZone={APP_ANALYTICS_TIME_ZONE}>
      <div className="grid gap-1.5">
        <TooltipMetric label={installLabel} value={point.installs.toLocaleString("en-US")} color={INSTALL_COLOR} />
        <TooltipMetric label="APPU · daily average" value={appuLabel} color={APPU_COLOR} />
      </div>
      {available && total ? (
        <div className="border-t border-foreground/[0.06] pt-2 text-[11px] leading-relaxed text-muted-foreground">
          <p>{total.installs.toLocaleString("en-US")} tracked installs that day</p>
          <p>{total.missingMoney > 0 ? "Proceeds data unavailable" : "Proceeds through today"}</p>
        </div>
      ) : <p className="text-[11px] text-muted-foreground">APPU unavailable</p>}
      {noteMatches.map((note) => (
        <div key={note.id} className="flex items-start justify-between gap-3 border-t border-foreground/[0.06] pt-2 text-violet-600">
          <span className="inline-flex min-w-0 items-start gap-1.5"><span className="mt-1 size-2 shrink-0 rounded-sm bg-violet-600" /><span className="break-words">{note.title}</span></span>
          {note.appVersion && note.appVersion !== "Unknown" ? (
            <span className="shrink-0 font-mono tabular-nums">{/^v/i.test(note.appVersion) ? note.appVersion : `v${note.appVersion}`}</span>
          ) : null}
        </div>
      ))}
    </ChartTooltip>
  );
}

function formatDate(timestamp: number, period: OverviewPeriod) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: APP_ANALYTICS_TIME_ZONE,
    ...(period === "day" || period === "yesterday" ? {} : { month: "short", day: "numeric" }),
    ...(overviewBucketHours(period) < 24 ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const } : {}),
  }).format(timestamp);
}
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}
