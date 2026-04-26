import { OAUTH_ISSUER, OAUTH_RESOURCE } from "@/lib/oauth/config";

export function protectedResourceMetadata() {
  // RFC 9728. Both bare and path-suffixed routes return this same body.
  return {
    resource: OAUTH_RESOURCE,
    authorization_servers: [OAUTH_ISSUER],
    scopes_supported: ["mcp"],
    bearer_methods_supported: ["header"],
    resource_documentation: `${OAUTH_ISSUER}/api/mcp`,
  };
}
