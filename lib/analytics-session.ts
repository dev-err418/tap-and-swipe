import { getSession } from "@/lib/session";
import { getAnalyticsAccess } from "@/lib/analytics-access";

export async function getAnalyticsViewer() {
  const session = await getSession();
  return getAnalyticsAccess(session?.discordId);
}
