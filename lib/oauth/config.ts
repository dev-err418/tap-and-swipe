function required(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
}

export const OAUTH_ISSUER = process.env.MCP_OAUTH_ISSUER ?? "https://tap-and-swipe.com";
export const OAUTH_RESOURCE = process.env.MCP_OAUTH_RESOURCE ?? "https://tap-and-swipe.com/api/mcp";
export const OAUTH_PROTECTED_RESOURCE_PATH = "/api/mcp";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;          // 15 min
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const AUTH_CODE_TTL_SECONDS = 10 * 60;             // 10 min

export const SUPPORTED_SCOPES = ["mcp"] as const;
export const DEFAULT_SCOPE = "mcp";

export function ownerDiscordId(): string {
  // Falls back to ADMIN_DISCORD_ID for single-user setups (already set in env).
  return process.env.OWNER_DISCORD_ID ?? required("ADMIN_DISCORD_ID");
}
