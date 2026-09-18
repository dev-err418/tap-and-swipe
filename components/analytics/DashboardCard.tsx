import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const DASHBOARD_CARD_ROOT_CLASS =
  "min-w-0 overflow-hidden rounded-[28px] border-0 bg-white pt-4 pb-0 shadow-none ring-0";
export const DASHBOARD_CARD_CONTENT_CLASS = "min-w-0 px-4";
export const DASHBOARD_CARD_HEADER_CLASS =
  "-mx-4 -mt-4 h-[46px] border-b-0 bg-white px-4 py-0";
export const DASHBOARD_CARD_TITLE_CLASS = "text-xs font-semibold text-black";
const DASHBOARD_CARD_BODY_WRAP_CLASS = "relative -mx-4 min-w-0 bg-white";
const DASHBOARD_CARD_BODY_CLASS = "min-w-0 overflow-hidden bg-white p-4";

interface DashboardCardProps extends Omit<ComponentProps<typeof Card>, "title"> {
  title: ReactNode;
  titleAccessory?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  headerClassName?: string;
  titleClassName?: string;
  bodyWrapClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
}

export function DashboardCard({
  title,
  titleAccessory,
  action,
  children,
  footer,
  className,
  headerClassName,
  titleClassName,
  bodyWrapClassName,
  contentClassName,
  footerClassName,
  ...props
}: DashboardCardProps) {
  return (
    <Card className={cn(DASHBOARD_CARD_ROOT_CLASS, className)} {...props}>
      <CardContent className={DASHBOARD_CARD_CONTENT_CLASS}>
        <div className={cn("flex flex-wrap items-center justify-between gap-3", DASHBOARD_CARD_HEADER_CLASS, headerClassName)}>
          <div className={cn(DASHBOARD_CARD_TITLE_CLASS, titleAccessory && "flex items-center gap-1", titleClassName)}>
            {title}
            {titleAccessory}
          </div>
          {action}
        </div>
        <div className={cn(DASHBOARD_CARD_BODY_WRAP_CLASS, bodyWrapClassName)}>
          <div className={cn(DASHBOARD_CARD_BODY_CLASS, contentClassName)}>{children}</div>
          {footer ? (
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center",
                footerClassName,
              )}
            >
              {footer}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
