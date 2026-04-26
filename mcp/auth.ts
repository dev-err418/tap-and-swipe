import { verifyAccessToken, type VerifiedAccessToken } from "@/lib/oauth/tokens";
import { OAuthError } from "@/lib/oauth/errors";
import { OAUTH_ISSUER, OAUTH_PROTECTED_RESOURCE_PATH, OAUTH_RESOURCE } from "@/lib/oauth/config";

export interface McpAuthInfo {
  token: string;
  clientId: string;
  scopes: string[];
  expiresAt: number;
  resource: URL;
  extra: { userId: string };
}

function buildWwwAuthenticate(error: string, description: string): string {
  const metaUrl = `${OAUTH_ISSUER}/.well-known/oauth-protected-resource${OAUTH_PROTECTED_RESOURCE_PATH}`;
  return `Bearer error="${error}", error_description="${description.replace(/"/g, "'")}", resource_metadata="${metaUrl}"`;
}

function unauthorized(error: string, description: string): Response {
  return new Response(null, {
    status: 401,
    headers: {
      "WWW-Authenticate": buildWwwAuthenticate(error, description),
      "Cache-Control": "no-store",
    },
  });
}

export async function authenticateMcpRequest(
  req: Request,
): Promise<{ ok: true; auth: McpAuthInfo } | { ok: false; response: Response }> {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    return { ok: false, response: unauthorized("invalid_token", "Missing bearer token") };
  }
  const token = match[1].trim();

  let verified: VerifiedAccessToken;
  try {
    verified = await verifyAccessToken(token, OAUTH_RESOURCE);
  } catch (e) {
    if (e instanceof OAuthError) {
      return { ok: false, response: unauthorized(e.code, e.description) };
    }
    return { ok: false, response: unauthorized("server_error", "Token validation error") };
  }

  const auth: McpAuthInfo = {
    token,
    clientId: verified.clientId,
    scopes: (verified.scope ?? "").split(" ").filter(Boolean),
    expiresAt: Math.floor(verified.expiresAt.getTime() / 1000),
    resource: new URL(verified.resource),
    extra: { userId: verified.userId },
  };
  return { ok: true, auth };
}
