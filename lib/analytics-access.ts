export const ANALYTICS_APP_IDS = ["poky", "glow", "versy"] as const;
export type AnalyticsAppId = (typeof ANALYTICS_APP_IDS)[number];

export type AnalyticsAccess = {
  name: string;
  appIds: readonly AnalyticsAppId[];
  canManage: boolean;
};

const APP_VIEWERS: Readonly<Record<string, AnalyticsAccess>> = {
  "643841344103776318": {
    name: "alberto",
    appIds: ["poky"],
    canManage: false,
  },
};

const OWNER_ACCESS: AnalyticsAccess = {
  name: "Arthur",
  appIds: ANALYTICS_APP_IDS,
  canManage: true,
};

export function getAnalyticsAccess(
  discordId: string | null | undefined,
  {
    adminDiscordId = process.env.ADMIN_DISCORD_ID,
    development = process.env.NODE_ENV === "development",
  }: { adminDiscordId?: string; development?: boolean } = {},
): AnalyticsAccess | null {
  if (discordId) {
    if (Object.hasOwn(APP_VIEWERS, discordId)) return APP_VIEWERS[discordId];
    return adminDiscordId && discordId === adminDiscordId ? OWNER_ACCESS : null;
  }
  // Keep local previews available, while signed-in viewers retain their scope.
  return development ? OWNER_ACCESS : null;
}

export function canAccessAnalyticsApp(access: AnalyticsAccess, appId: string) {
  return access.appIds.some((id) => id === appId);
}

export function canAccessAnalyticsPage(
  access: AnalyticsAccess,
  params: { app?: string | null; site?: string | null; tab?: string | null },
) {
  if (access.canManage) return true;
  if (params.site || (params.tab && params.tab !== "analytics")) return false;
  return !params.app || canAccessAnalyticsApp(access, params.app);
}
