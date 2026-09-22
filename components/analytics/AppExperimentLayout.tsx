import type { ReactNode } from "react";
import { DashboardCard } from "@/components/analytics/DashboardCard";
import { cn } from "@/lib/utils";

/** Shared A/B-test presentation; each report keeps its own metric definitions. */
export function AppExperimentLayout({ title, subtitle, titleAccessory, action, children, label }: {
  title: ReactNode; subtitle?: ReactNode; titleAccessory?: ReactNode;
  action?: ReactNode; children: ReactNode; label?: string;
}) {
  return <DashboardCard title={title} titleAccessory={titleAccessory}
    titleClassName="flex items-center gap-1.5" aria-label={label}
    action={action || subtitle ? <div className="flex items-center gap-2">{action}{subtitle ? <span className="text-xs text-muted-foreground">{subtitle}</span> : null}</div> : undefined}
    contentClassName="min-w-0 p-0">{children}</DashboardCard>;
}

export function ExperimentTable({ headings, children, caption }: { headings: ReactNode; children: ReactNode; caption?: string }) {
  return <div className="overflow-x-auto"><table className="w-max min-w-full text-sm">
    {caption && <caption className="sr-only">{caption}</caption>}
    <thead><tr className="border-b border-black/10 text-left text-xs text-black/50">{headings}</tr></thead>
    <tbody>{children}</tbody>
  </table></div>;
}

export function ExperimentTh({ children, right = false, className }: { children: ReactNode; right?: boolean; className?: string }) {
  return <th scope="col" className={cn("whitespace-nowrap px-4 py-3 font-medium", right && "text-right", className)}>{children}</th>;
}
export function ExperimentTd({ children }: { children: ReactNode }) {
  return <td className="whitespace-nowrap px-4 py-3">{children}</td>;
}
export function ExperimentNumberTd({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums", className)}>{children}</td>;
}
export function ExperimentVariantLabel({ index, children }: { index: number; children: ReactNode }) {
  return <div className="flex items-center gap-2 whitespace-nowrap">
    <span className="inline-flex rounded-md bg-black/[0.055] px-2 py-0.5 text-xs font-medium">Variant {String.fromCharCode(65 + Math.max(0, index))}</span>
    <span className="font-medium">{children}</span>
  </div>;
}
