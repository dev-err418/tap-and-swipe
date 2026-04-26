import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "@/mcp/server";
import { authenticateMcpRequest } from "@/mcp/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handle(req: Request): Promise<Response> {
  const auth = await authenticateMcpRequest(req);
  if (!auth.ok) return auth.response;

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createMcpServer();
  await server.connect(transport);
  return transport.handleRequest(req, { authInfo: auth.auth });
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
