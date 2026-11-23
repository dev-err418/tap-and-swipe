"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { VERSY_ANALYTICS_PLATFORM_LABELS, versyAnalyticsPlatformFilter, type VersyAnalyticsPlatformFilter } from "@/lib/versy-analytics-platform";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DASHBOARD_PICKER_TRIGGER_CLASS,
  DASHBOARD_POPOVER_CLASS,
  DASHBOARD_POPOVER_ITEM_CLASS,
} from "@/components/analytics/dashboard-surface";

type Period = "day" | "yesterday" | "3days" | "week" | "month" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  day: "Today",
  yesterday: "Yesterday",
  "3days": "Last 3 days",
  week: "Last week",
  month: "Last month",
  all: "All time",
};

export default function AnalyticsPeriodSelect({
  period,
  site,
  app,
  platform = "ios",
}: {
  period: Period;
  site?: "appsprint" | "postback" | "grewit" | "community";
  app?: "glow" | "poky" | "versy";
  platform?: VersyAnalyticsPlatformFilter;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(nextPeriod: Period, nextPlatform: VersyAnalyticsPlatformFilter) {
    if (nextPeriod === period && nextPlatform === platform) return;
    const params = new URLSearchParams();
    if (nextPeriod !== "week") params.set("period", nextPeriod);
    if (site) params.set("site", site);
    if (app) params.set("app", app);
    if (app === "versy" && nextPlatform !== "ios") params.set("platform", nextPlatform);
    const query = params.toString();
    startTransition(() => router.push(`/analytics${query ? `?${query}` : ""}`));
  }

  return (
    <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
      {app === "versy" ? (
        <Select value={platform} disabled={isPending} onValueChange={(value) => navigate(period, versyAnalyticsPlatformFilter(value))}>
          <SelectTrigger aria-label="Versy platform" className={`${DASHBOARD_PICKER_TRIGGER_CLASS} w-28 shrink-0`}>
            <SelectValue>{VERSY_ANALYTICS_PLATFORM_LABELS[platform]}</SelectValue>
          </SelectTrigger>
          <SelectContent position="popper" align="end" className={DASHBOARD_POPOVER_CLASS}>
            {Object.entries(VERSY_ANALYTICS_PLATFORM_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} className={DASHBOARD_POPOVER_ITEM_CLASS}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
      <Select
        value={period}
        disabled={isPending}
        onValueChange={(value) => navigate(value as Period, platform)}
      >
        <SelectTrigger
          aria-label="Analytics period"
          className={`${DASHBOARD_PICKER_TRIGGER_CLASS} w-full sm:w-[160px]`}
        >
          <SelectValue>{PERIOD_LABELS[period]}</SelectValue>
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="end"
          className={DASHBOARD_POPOVER_CLASS}
        >
          {Object.entries(PERIOD_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value} className={DASHBOARD_POPOVER_ITEM_CLASS}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
