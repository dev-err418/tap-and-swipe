"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

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
  site?: "appsprint" | "postback";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="relative inline-flex">
      <span className="sr-only">Analytics period</span>
      <select
        value={period}
        disabled={isPending}
        onChange={(event) => {
          const nextPeriod = event.target.value as Period;
          const params = new URLSearchParams();
          if (nextPeriod !== "week") params.set("period", nextPeriod);
          if (site) params.set("site", site);
          const query = params.toString();

          startTransition(() => {
            router.push(`/analytics${query ? `?${query}` : ""}`);
          });
        }}
        className="h-10 min-w-40 appearance-none rounded-[13px] border border-black/10 bg-white py-0 pl-3 pr-9 text-sm font-medium text-black shadow-sm outline-none transition-all hover:bg-black/[0.025] focus:border-black/25 focus:ring-3 focus:ring-black/5 disabled:cursor-wait disabled:opacity-60"
      >
        {PERIOD_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-black/45" />
    </label>
  );
}
