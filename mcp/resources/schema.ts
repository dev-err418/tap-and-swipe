import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export function registerSchemaResource(server: McpServer) {
  server.registerResource(
    "prisma_schema",
    "taprm://schema/prisma",
    {
      title: "Prisma schema",
      description:
        "Current contents of prisma/schema.prisma. Read this when you need exact field names or types for the main database.",
      mimeType: "text/plain",
    },
    async (uri) => {
      const path = join(process.cwd(), "prisma", "schema.prisma");
      const text = await readFile(path, "utf8");
      return {
        contents: [{ uri: uri.href, mimeType: "text/plain", text }],
      };
    },
  );
}
