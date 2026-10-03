import { getAnalyticsViewer } from "@/lib/analytics-session";
import AnalyticsLoading from "@/components/analytics/AnalyticsLoading";

export default async function Loading() {
  const access = await getAnalyticsViewer();
  return access ? <AnalyticsLoading access={access} /> : null;
}
