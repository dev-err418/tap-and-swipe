"use client";

import { useId } from "react";
import { CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { parisDatetimeToDate } from "@/lib/app-analytics-time";
import type { TrendPoint } from "@/lib/versy-acquisition-report";
import { ChartTooltip, LegendItem, TooltipMetric } from "./AppSprintFunnelCharts";
import { DashboardCard } from "./DashboardCard";

const roasColor = "var(--analytics-orange)";
const spendColor = "color-mix(in srgb, var(--analytics-orange) 15%, transparent)";
const euro = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
const date = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", month: "short", day: "numeric" });
const tick = { fill: "var(--muted-foreground)", fontSize: 11 };
const gapStart = Date.parse("2026-11-21T13:13:23+01:00"), gapEnd = Date.parse("2026-11-24T16:33:03+01:00");

export default function VersyBlendedRoasChart({ trend }: { trend: TrendPoint[] }) {
  const hatch = useId().replace(/:/g, "");
  const points = trend.map(d => ({ ...d, time: parisDatetimeToDate(d.date + "T12:00").getTime() }));
  const first = points[0]?.time ?? 0, last = points.at(-1)?.time ?? 0;
  const maturing = points.at(-7);
  const hasGap = gapStart < last && gapEnd > first;
  return <DashboardCard title="Blended ROAS" action={<span className="text-xs text-muted-foreground">iOS + Android</span>} contentClassName="pt-0">
    {points.some(d => d.spend != null && d.spend > 0) ? <>
      <div className="h-64 w-full text-xs sm:h-80" aria-label="Daily blended ROAS and Meta spend in euros">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} accessibilityLayer margin={{ top: 8, left: 0, right: 4, bottom: 0 }}>
            <defs><pattern id={hatch} width="9" height="9" patternUnits="userSpaceOnUse"><path d="M-1,1 l2,-2 M0,9 l9,-9 M8,10 l2,-2" stroke="var(--foreground)" strokeOpacity={0.09} /></pattern></defs>
            <CartesianGrid vertical={false} stroke="var(--foreground)" strokeOpacity={0.055} />
            <XAxis dataKey="time" type="number" scale="time" domain={[first, last]} ticks={points.filter((_, i) => i % 3 === 0).map(d => d.time)}
              tickFormatter={t => date.format(t)} tick={tick} tickLine={false} axisLine={false} minTickGap={22} />
            <YAxis tickFormatter={v => v.toFixed(1) + "×"} domain={[Math.min(0, ...points.map(d => d.roas ?? 0)), Math.max(1, ...points.map(d => d.roas ?? 0))]} tick={tick} tickLine={false} axisLine={false} width={44} />
            <YAxis yAxisId="spend" orientation="right" tickFormatter={v => "€" + v} tick={tick} tickLine={false} axisLine={false} width={52} />
            {hasGap && <ReferenceArea x1={Math.max(gapStart, first)} x2={Math.min(gapEnd, last)} fill="var(--analytics-violet)" fillOpacity={0.12} />}
            {maturing && <ReferenceArea x1={parisDatetimeToDate(maturing.date + "T00:00").getTime()} x2={last} fill={`url(#${hatch})`} fillOpacity={1} />}
            <ReferenceLine y={1} stroke="var(--muted-foreground)" strokeOpacity={0.45} strokeDasharray="4 4" />
            <Tooltip filterNull={false} cursor={{ stroke: "var(--foreground)", strokeOpacity: 0.12, strokeDasharray: "3 3" }} content={({ active, payload }) => {
              const d = payload?.[0]?.payload as typeof points[number] | undefined;
              if (!active || !d) return null;
              return <ChartTooltip date={d.time} timeZone="Europe/Paris"><div className="grid gap-1.5">
                <TooltipMetric label="Blended ROAS" value={d.roas == null ? "—" : d.roas.toFixed(2) + "×"} color={roasColor} />
                <TooltipMetric label="Meta spend" value={d.spend == null ? "—" : euro.format(d.spend)} color={spendColor} />
                <TooltipMetric label="Net proceeds" value={d.proceeds == null ? "—" : euro.format(d.proceeds)} color="var(--analytics-green)" />
                {maturing && d.time >= maturing.time && <span className="text-muted-foreground">Trials still maturing</span>}
                {d.incomplete && <span className="text-muted-foreground">Spend incomplete</span>}
              </div></ChartTooltip>;
            }} />
            <Line yAxisId="spend" dataKey={d => d.incomplete ? null : d.spend} name="Meta spend" stroke={spendColor} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            {points.filter(d => d.incomplete && d.spend != null).map(d => <ReferenceDot key={d.date} x={d.time} y={d.spend!} yAxisId="spend" r={2} fill="none" stroke={spendColor} />)}
            <Line dataKey="roas" name="Blended ROAS" stroke={roasColor} strokeWidth={2.5} dot={{ r: 2, fill: roasColor }} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div aria-label="Chart legend" className="mt-3 flex flex-wrap justify-center gap-2 text-[11px]">
        <LegendItem color={roasColor} label="Blended ROAS" /><LegendItem color={spendColor} label="Meta spend" />
        {hasGap && <LegendItem color="var(--analytics-violet)" label="iOS attribution gap" />}
      </div>
    </> : <p role="status" className="py-4 text-sm text-muted-foreground">{points.some(d => d.spend != null) ? "No Meta spend in this market." : "Meta spend is unavailable."}</p>}
  </DashboardCard>;
}
