import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerNotifyTools(server: McpServer) {
  server.registerTool(
    "notify_send",
    {
      title: "Send push notification",
      description:
        "Send a push notification to the owner's iPhone via the Notify webhook. " +
        "Server-side proxy — the Notify URL and secret live in server env, never in tool input. " +
        "Use sparingly: typically once per routine product summary, never inside a tight loop.",
      inputSchema: {
        title: z.string().min(1).max(200),
        subtitle: z.string().max(200).optional(),
        body: z.string().max(2000).optional(),
        interruption_level: z
          .enum(["passive", "active", "time-sensitive", "critical"])
          .optional(),
        thread_id: z.string().max(64).optional(),
        url: z.string().url().optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (args) => {
      const target = process.env.NOTIFY_URL;
      if (!target) {
        throw new Error("Server misconfigured: NOTIFY_URL is not set");
      }

      const res = await fetch(target, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });

      const respBody = await res.text();
      if (!res.ok) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Notify API ${res.status}: ${respBody.slice(0, 500)}`,
            },
          ],
        };
      }
      return {
        content: [{ type: "text", text: respBody.slice(0, 500) }],
      };
    },
  );
}
