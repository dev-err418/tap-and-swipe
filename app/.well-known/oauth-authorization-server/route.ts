import { NextResponse } from "next/server";
import { OAUTH_ISSUER } from "@/lib/oauth/config";

export const dynamic = "force-static";
export const runtime = "nodejs";

export function GET() {
  // RFC 8414 Authorization Server Metadata. Static — DCR not advertised.
  return NextResponse.json({
    issuer: OAUTH_ISSUER,
    authorization_endpoint: `${OAUTH_ISSUER}/api/oauth/authorize`,
    token_endpoint: `${OAUTH_ISSUER}/api/oauth/token`,
    revocation_endpoint: `${OAUTH_ISSUER}/api/oauth/revoke`,
    revocation_endpoint_auth_methods_supported: ["client_secret_post"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
    scopes_supported: ["mcp"],
  });
}
