import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { findClient, redirectUriAllowed } from "@/lib/oauth/clients";
import { signConsentToken, verifyConsentToken } from "@/lib/oauth/consent";
import { mintAuthorizationCode } from "@/lib/oauth/tokens";
import { OAUTH_RESOURCE, ownerDiscordId, SUPPORTED_SCOPES } from "@/lib/oauth/config";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface AuthorizeParams {
  clientId: string;
  redirectUri: string;
  state: string | null;
  codeChallenge: string;
  codeChallengeMethod: string;
  scope: string | null;
  resource: string;
  responseType: string;
}

function parseAuthorizeParams(req: NextRequest): AuthorizeParams {
  const sp = req.nextUrl.searchParams;
  return {
    clientId: sp.get("client_id") ?? "",
    redirectUri: sp.get("redirect_uri") ?? "",
    state: sp.get("state"),
    codeChallenge: sp.get("code_challenge") ?? "",
    codeChallengeMethod: sp.get("code_challenge_method") ?? "",
    scope: sp.get("scope"),
    resource: sp.get("resource") ?? OAUTH_RESOURCE,
    responseType: sp.get("response_type") ?? "",
  };
}

function errorRedirect(redirectUri: string, code: string, description: string, state: string | null) {
  const url = new URL(redirectUri);
  url.searchParams.set("error", code);
  url.searchParams.set("error_description", description);
  if (state) url.searchParams.set("state", state);
  // 303 ensures the user-agent issues a GET against the redirect_uri (per RFC 6749 §3.1).
  return NextResponse.redirect(url, 303);
}

function htmlError(status: number, title: string, body: string): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>body{font:16px/1.5 system-ui;background:#0b0b0c;color:#eee;margin:0;padding:48px;max-width:560px}
    h1{font-size:20px;margin:0 0 12px}p{margin:8px 0;color:#bbb}a{color:#fb923c}</style>
    </head><body><h1>${title}</h1><p>${body}</p></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(req: NextRequest) {
  const params = parseAuthorizeParams(req);

  // 1. Validate request shape before redirecting anywhere.
  if (!params.clientId || !params.redirectUri || !params.codeChallenge || !params.codeChallengeMethod) {
    return htmlError(400, "Invalid request", "Required parameter missing.");
  }
  if (params.responseType !== "code") {
    return htmlError(400, "Invalid response_type", "Only response_type=code is supported.");
  }
  if (params.codeChallengeMethod !== "S256") {
    return htmlError(400, "Invalid PKCE method", "Only code_challenge_method=S256 is supported.");
  }

  const client = await findClient(params.clientId);
  if (!client) {
    return htmlError(400, "Unknown client", "client_id is not registered.");
  }
  if (!redirectUriAllowed(client, params.redirectUri)) {
    return htmlError(400, "Invalid redirect_uri", "Redirect URI is not on the allowlist.");
  }

  // From here on, errors can be reported back to the client via redirect.

  if (params.scope) {
    const requested = params.scope.split(" ").filter(Boolean);
    const ok = requested.every((s) => (SUPPORTED_SCOPES as readonly string[]).includes(s));
    if (!ok) {
      return errorRedirect(params.redirectUri, "invalid_scope", "Requested scope not supported", params.state);
    }
  }

  if (params.resource !== OAUTH_RESOURCE) {
    return errorRedirect(
      params.redirectUri,
      "invalid_target",
      `Resource must equal ${OAUTH_RESOURCE}`,
      params.state,
    );
  }

  // 2. Authenticate the resource owner via existing Discord session.
  const session = await getSession();
  if (!session) {
    return htmlError(
      401,
      "Sign in required",
      `Sign in via <a href="/api/auth/discord">Discord</a> first, then re-trigger the connector setup in claude.ai.`,
    );
  }
  if (session.discordId !== ownerDiscordId()) {
    return errorRedirect(params.redirectUri, "access_denied", "Account not authorized", params.state);
  }

  // 3. Render consent page with a signed CSRF token for the POST.
  const consentToken = await signConsentToken({
    clientId: params.clientId,
    redirectUri: params.redirectUri,
    state: params.state,
    codeChallenge: params.codeChallenge,
    scope: params.scope,
    resource: params.resource,
    discordId: session.discordId,
  });

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Authorize ${escapeHtml(client.name)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body{font:16px/1.5 system-ui;background:#0b0b0c;color:#eee;margin:0;padding:48px;max-width:520px}
  h1{font-size:22px;margin:0 0 8px}
  p{margin:8px 0;color:#bbb}
  .scopes{background:#16161a;border:1px solid #2a2a2f;border-radius:8px;padding:12px 16px;margin:16px 0}
  .scopes code{color:#fb923c}
  form{display:flex;gap:8px;margin-top:24px}
  button{font:inherit;padding:10px 18px;border-radius:8px;border:0;cursor:pointer}
  .approve{background:#fb923c;color:#0b0b0c;font-weight:600}
  .deny{background:transparent;color:#bbb;border:1px solid #2a2a2f}
</style></head><body>
<h1>Authorize ${escapeHtml(client.name)}</h1>
<p>Signed in as <strong>${escapeHtml(session.discordUsername)}</strong>.</p>
<p>${escapeHtml(client.name)} is asking for access to your tap-and-swipe analytics MCP.</p>
<div class="scopes">
  <div>Scope: <code>${escapeHtml(params.scope ?? "mcp")}</code></div>
  <div>Audience: <code>${escapeHtml(params.resource)}</code></div>
</div>
<form method="POST" action="/api/oauth/authorize">
  <input type="hidden" name="consent" value="${consentToken}">
  <input type="hidden" name="decision" value="approve">
  <button class="approve" type="submit">Approve</button>
</form>
<form method="POST" action="/api/oauth/authorize" style="margin-top:8px">
  <input type="hidden" name="consent" value="${consentToken}">
  <input type="hidden" name="decision" value="deny">
  <button class="deny" type="submit">Deny</button>
</form>
</body></html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      // Defense in depth: prevent the page from being framed.
      "X-Frame-Options": "DENY",
      "Content-Security-Policy":
        "default-src 'self'; style-src 'unsafe-inline'; " +
        "form-action 'self' https://claude.ai https://claude.com; " +
        "frame-ancestors 'none'",
    },
  });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const consentRaw = form.get("consent");
  const decision = form.get("decision");

  if (typeof consentRaw !== "string") {
    return htmlError(400, "Invalid consent", "Consent token missing.");
  }

  let payload;
  try {
    payload = await verifyConsentToken(consentRaw);
  } catch {
    return htmlError(400, "Invalid consent", "Consent token expired or tampered.");
  }

  // Re-verify the user is still the same Discord owner — defense against a
  // consent token leak combined with a different active session.
  const session = await getSession();
  if (!session || session.discordId !== payload.discordId || session.discordId !== ownerDiscordId()) {
    return htmlError(401, "Session changed", "Re-authenticate and try again.");
  }

  if (decision !== "approve") {
    return errorRedirect(payload.redirectUri, "access_denied", "User denied", payload.state);
  }

  // Find the user record so we can store userId on the code.
  const user = await prisma.user.findUnique({ where: { discordId: payload.discordId } });
  if (!user) {
    return errorRedirect(payload.redirectUri, "server_error", "User row missing", payload.state);
  }

  const code = await mintAuthorizationCode({
    clientId: payload.clientId,
    userId: user.id,
    redirectUri: payload.redirectUri,
    codeChallenge: payload.codeChallenge,
    scope: payload.scope,
    resource: payload.resource,
  });

  const url = new URL(payload.redirectUri);
  url.searchParams.set("code", code);
  if (payload.state) url.searchParams.set("state", payload.state);
  return NextResponse.redirect(url, 303);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
