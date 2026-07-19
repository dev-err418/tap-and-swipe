import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const DASHBOARD_CARD_ROOT_CLASS =
  "min-w-0 overflow-hidden rounded-lg border bg-transparent pt-4 pb-0 shadow-none ring-0";
export const DASHBOARD_CARD_CONTENT_CLASS = "min-w-0 px-4";
export const DASHBOARD_CARD_HEADER_CLASS =
  "-mx-4 -mt-4 rounded-t-lg bg-muted/50 px-4 pt-3 pb-2.5";
export const DASHBOARD_CARD_TITLE_CLASS =
  "text-sm font-medium text-muted-foreground";
const DASHBOARD_CARD_BODY_WRAP_CLASS = "-mx-4 min-w-0 bg-muted/50";
const DASHBOARD_CARD_BODY_CLASS =
  "min-w-0 overflow-hidden rounded-t-lg border-t border-border/60 bg-background p-4";

interface DashboardCardProps extends Omit<ComponentProps<typeof Card>, "title"> {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  headerClassName?: string;
  titleClassName?: string;
  bodyWrapClassName?: string;
  contentClassName?: string;
}

export function DashboardCard({
  title,
  action,
  children,
  className,
  headerClassName,
  titleClassName,
  bodyWrapClassName,
  contentClassName,
  ...props
}: DashboardCardProps) {
  return (
    <Card className={cn(DASHBOARD_CARD_ROOT_CLASS, className)} {...props}>
      <CardContent className={DASHBOARD_CARD_CONTENT_CLASS}>
        <div className={cn("flex flex-wrap items-center justify-between gap-3", DASHBOARD_CARD_HEADER_CLASS, headerClassName)}>
          <div className={cn(DASHBOARD_CARD_TITLE_CLASS, titleClassName)}>{title}</div>
          {action}
        </div>
        <div className={cn(DASHBOARD_CARD_BODY_WRAP_CLASS, bodyWrapClassName)}>
          <div className={cn(DASHBOARD_CARD_BODY_CLASS, contentClassName)}>{children}</div>
        </div>
      </CardContent>
    </Card>
  );
}
