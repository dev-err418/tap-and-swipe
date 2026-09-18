"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
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

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "day", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "3days", label: "Last 3 days" },
  { value: "week", label: "Last week" },
  { value: "month", label: "Last month" },
  { value: "all", label: "All time" },
];

export default function AnalyticsPeriodSelect({
  period,
  site,
}: {
  period: Period;
  site?: "appsprint" | "postback" | "grewit" | "community";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={period}
      disabled={isPending}
      onValueChange={(value) => {
        const nextPeriod = value as Period;
        if (nextPeriod === period) return;
        const params = new URLSearchParams();
        if (nextPeriod !== "week") params.set("period", nextPeriod);
        if (site) params.set("site", site);
        const query = params.toString();
        startTransition(() => {
          router.push(`/analytics${query ? `?${query}` : ""}`);
        });
      }}
    >
      <SelectTrigger
        aria-label="Analytics period"
        className={`${DASHBOARD_PICKER_TRIGGER_CLASS} w-full sm:w-[160px]`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        position="popper"
        align="end"
        className={DASHBOARD_POPOVER_CLASS}
      >
        {PERIOD_OPTIONS.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className={DASHBOARD_POPOVER_ITEM_CLASS}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
