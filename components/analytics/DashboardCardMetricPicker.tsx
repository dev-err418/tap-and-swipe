"use client";

import {
  DASHBOARD_POPOVER_CLASS,
  DASHBOARD_POPOVER_ITEM_CLASS,
} from "@/components/analytics/dashboard-surface";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export function DashboardCardMetricPicker<TMetric extends string>({
  ariaLabel = "Card metric",
  value,
  options,
  labels,
  onValueChange,
}: {
  ariaLabel?: string;
  value: TMetric;
  options: readonly TMetric[];
  labels: Record<TMetric, string>;
  onValueChange: (value: TMetric) => void;
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        const selected = options.find((option) => option === nextValue);
        if (selected) onValueChange(selected);
      }}
    >
      <SelectTrigger
        size="sm"
        aria-label={ariaLabel}
        className="size-5 min-w-5 cursor-pointer justify-center gap-0 rounded-full border-0 bg-transparent p-0 text-muted-foreground shadow-none hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 data-[size=sm]:h-5 [&_svg]:!size-3.5"
      >
        <span className="sr-only">{labels[value]}</span>
      </SelectTrigger>
      <SelectContent
        side="bottom"
        align="start"
        position="popper"
        className={DASHBOARD_POPOVER_CLASS}
      >
        {options.map((option) => (
          <SelectItem
            key={option}
            value={option}
            className={DASHBOARD_POPOVER_ITEM_CLASS}
          >
            {labels[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
