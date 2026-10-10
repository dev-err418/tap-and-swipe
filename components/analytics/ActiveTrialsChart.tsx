"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ActiveTrials } from "@/lib/active-trials";
import { DashboardCard } from "./DashboardCard";

export default function ActiveTrialsChart({ report, windowLabel }: { report: ActiveTrials; windowLabel: string }) {
  return <DashboardCard title="Trials still active" action={<span className="text-xs text-muted-foreground">{windowLabel}</span>} contentClassName="min-w-0">
    <div className="mb-4">
      <p className="text-2xl font-semibold tabular-nums">{report.total.toLocaleString("en-US")}</p>
      <p className="text-xs text-muted-foreground">Currently unexpired, with no recorded cancellation or paid conversion</p>
    </div>
    <div className="h-64 w-full text-xs" aria-label="Currently active trials by elapsed day since trial start">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart accessibilityLayer data={report.days} margin={{ top: 24, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} interval={0} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
          <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} formatter={(value) => [Number(value).toLocaleString("en-US"), "Active trials"]} />
          <Bar dataKey="active" name="Active trials" fill="#1d4ed8" radius={[4, 4, 0, 0]} maxBarSize={52} isAnimationActive={false}>
            <LabelList dataKey="active" position="top" className="fill-foreground" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
    {report.total === 0 ? <p className="mt-2 text-sm text-muted-foreground">No confirmed active trials from the selected period.</p> : null}
    <p className="mt-3 text-xs text-muted-foreground">The date filter selects trial starts; status is checked through now. Day 0 is the first 24 hours. A 7-day trial normally expires or converts before the Day 7 bar. Recorded expiry dates also apply to older 3-day trials.</p>
    {report.unknownExpiry > 0 ? <p className="mt-2 text-xs text-muted-foreground">{report.unknownExpiry.toLocaleString("en-US")} trials excluded because their expiry is unknown.</p> : null}
    {report.older > 0 ? <p className="mt-2 text-xs text-muted-foreground">{report.older.toLocaleString("en-US")} active trials aged 8+ days are included in the total, outside these bars.</p> : null}
  </DashboardCard>;
}
