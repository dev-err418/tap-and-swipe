export type OAuthErrorCode =
  | "invalid_request"
  | "invalid_client"
  | "invalid_grant"
  | "invalid_token"
  | "unauthorized_client"
  | "unsupported_grant_type"
  | "insufficient_scope"
  | "invalid_scope"
  | "invalid_target"
  | "access_denied"
  | "server_error"
  | "temporarily_unavailable";

export class OAuthError extends Error {
  constructor(
    public code: OAuthErrorCode,
    public description: string,
    public httpStatus: number = 400,
  ) {
    super(`${code}: ${description}`);
  }

  toJson(): { error: string; error_description: string } {
    return { error: this.code, error_description: this.description };
  }
}

export function jsonError(err: OAuthError): Response {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  });
  if (err.code === "invalid_client") {
    headers.set("WWW-Authenticate", 'Basic realm="oauth"');
  }
  return new Response(JSON.stringify(err.toJson()), {
    status: err.httpStatus,
    headers,
  });
}
