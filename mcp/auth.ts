import { timingSafeEqual } from "node:crypto";

export class McpAuthError extends Error {
  constructor(public reason: string) {
    super(reason);
  }
}

export function authorizeRequest(req: Request): void {
  const expected = process.env.MCP_BEARER_TOKEN;
  if (!expected) {
    throw new McpAuthError("server-misconfigured");
  }

  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) {
    throw new McpAuthError("missing-bearer");
  }

  const provided = match[1].trim();
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new McpAuthError("bad-bearer");
  }
}
