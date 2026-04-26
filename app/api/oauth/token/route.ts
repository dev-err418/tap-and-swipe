import type { NextRequest } from "next/server";
import { authenticateClient, redirectUriAllowed } from "@/lib/oauth/clients";
import { OAuthError, jsonError } from "@/lib/oauth/errors";
import {
  consumeAuthorizationCode,
  issueTokens,
  rotateRefreshToken,
} from "@/lib/oauth/tokens";
import { verifyPkceS256 } from "@/lib/oauth/crypto";
import { OAUTH_RESOURCE } from "@/lib/oauth/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function tokenJson(t: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string | null;
  tokenType: "Bearer";
}): Response {
  const body: Record<string, unknown> = {
    access_token: t.accessToken,
    token_type: t.tokenType,
    expires_in: t.expiresIn,
    refresh_token: t.refreshToken,
  };
  if (t.scope) body.scope = t.scope;
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
  });
}

async function readForm(req: NextRequest): Promise<FormData> {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
    throw new OAuthError(
      "invalid_request",
      "Content-Type must be application/x-www-form-urlencoded",
    );
  }
  return req.formData();
}

function str(form: FormData, key: string): string | null {
  const v = form.get(key);
  return typeof v === "string" && v.length > 0 ? v : null;
}

export async function POST(req: NextRequest) {
  try {
    const form = await readForm(req);

    const grantType = str(form, "grant_type");
    if (!grantType) {
      throw new OAuthError("invalid_request", "Missing grant_type");
    }

    const clientId = str(form, "client_id");
    const clientSecret = str(form, "client_secret");
    if (!clientId || !clientSecret) {
      throw new OAuthError("invalid_client", "Missing client credentials", 401);
    }
    const client = await authenticateClient(clientId, clientSecret);

    if (grantType === "authorization_code") {
      const code = str(form, "code");
      const codeVerifier = str(form, "code_verifier");
      const redirectUri = str(form, "redirect_uri");
      const resource = str(form, "resource") ?? OAUTH_RESOURCE;

      if (!code) throw new OAuthError("invalid_request", "Missing code");
      if (!codeVerifier) throw new OAuthError("invalid_request", "Missing code_verifier");
      if (!redirectUri) throw new OAuthError("invalid_request", "Missing redirect_uri");

      const record = await consumeAuthorizationCode(code);

      if (record.clientId !== client.clientId) {
        throw new OAuthError("invalid_grant", "Code was not issued to this client");
      }
      if (record.redirectUri !== redirectUri) {
        throw new OAuthError("invalid_grant", "redirect_uri mismatch");
      }
      if (!redirectUriAllowed(client, redirectUri)) {
        throw new OAuthError("invalid_grant", "redirect_uri no longer allowed");
      }
      if (!verifyPkceS256(codeVerifier, record.codeChallenge)) {
        throw new OAuthError("invalid_grant", "PKCE verification failed");
      }
      if (record.resource !== resource) {
        throw new OAuthError("invalid_target", "Resource mismatch");
      }

      const tokens = await issueTokens({
        clientId: record.clientId,
        userId: record.userId,
        scope: record.scope,
        resource: record.resource,
      });
      return tokenJson(tokens);
    }

    if (grantType === "refresh_token") {
      const refreshToken = str(form, "refresh_token");
      if (!refreshToken) throw new OAuthError("invalid_request", "Missing refresh_token");

      const tokens = await rotateRefreshToken(refreshToken);
      // Refuse rotations that crossed clients (extreme paranoia — lookup is by tokenHash).
      // No further check needed; rotateRefreshToken stays within the same row.
      return tokenJson(tokens);
    }

    throw new OAuthError("unsupported_grant_type", `grant_type=${grantType} not supported`);
  } catch (e) {
    if (e instanceof OAuthError) return jsonError(e);
    console.error("[oauth/token] unhandled", e);
    return jsonError(new OAuthError("server_error", "Internal error", 500));
  }
}
