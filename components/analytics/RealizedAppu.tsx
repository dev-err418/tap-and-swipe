import { realizedAppuSuffix, type RealizedAppu as Metric } from "@/lib/realized-appu";

export default function RealizedAppu({ metric }: { metric?: Metric }) {
  if (!metric) return null;
  const explanation = metric.missingMoney ? "Realized APPU is unavailable because mature-user proceeds are incomplete."
    : metric.users === 0 ? "No users have completed their trial observation window yet."
    : `Net proceeds / ${metric.users.toLocaleString("en-US")} mature users, including non-payers and cancelled trials. The full offered trial window and any recorded trial end must have passed. Renewals and refunds are included.`;
  return <span className="whitespace-nowrap text-[0.8em] font-normal text-muted-foreground" title={explanation}>
    {realizedAppuSuffix(metric)}
  </span>;
}
