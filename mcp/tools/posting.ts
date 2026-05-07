import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/prisma";

const PLATFORMS = [
  "linkedin",
  "youtube-long",
  "youtube-shorts",
  "instagram-reels",
] as const;

const PlatformSchema = z.enum(PLATFORMS);

function shapePost(p: {
  id: string;
  title: string;
  description: string | null;
  platforms: string[];
  publishAt: Date;
  notifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    platforms: p.platforms,
    publishAt: p.publishAt.toISOString(),
    notifiedAt: p.notifiedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export function registerPostingTools(server: McpServer) {
  server.registerTool(
    "posting_list",
    {
      title: "List scheduled posts",
      description:
        "Return calendar entries from the ScheduledPost table, ordered by publishAt ascending. " +
        "Optional `from`/`to` ISO timestamps narrow the window. Optional `platform` scopes to a " +
        "single platform (post is included if its platforms array contains the value).",
      inputSchema: {
        from: z.string().datetime().optional().describe("ISO timestamp inclusive lower bound"),
        to: z.string().datetime().optional().describe("ISO timestamp exclusive upper bound"),
        platform: PlatformSchema.optional(),
        limit: z.number().int().min(1).max(500).optional().default(100),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ from, to, platform, limit = 100 }) => {
      const where: Record<string, unknown> = {};
      if (from || to) {
        where.publishAt = {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lt: new Date(to) } : {}),
        };
      }
      if (platform) {
        where.platforms = { has: platform };
      }

      const posts = await prisma.scheduledPost.findMany({
        where,
        orderBy: { publishAt: "asc" },
        take: limit,
      });

      const result = {
        count: posts.length,
        posts: posts.map(shapePost),
      };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.registerTool(
    "posting_create",
    {
      title: "Create a scheduled post",
      description:
        "Add a new entry to the content calendar. `publishAt` is the moment the post should go live; " +
        "a push reminder fires when that time is reached. The actual posting is still done manually on each platform.",
      inputSchema: {
        title: z.string().min(1).max(200),
        publishAt: z.string().datetime().describe("ISO timestamp, e.g. 2026-05-08T18:00:00Z"),
        platforms: z.array(PlatformSchema).min(1),
        description: z.string().max(2000).optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ title, publishAt, platforms, description }) => {
      const post = await prisma.scheduledPost.create({
        data: {
          title,
          publishAt: new Date(publishAt),
          platforms,
          description: description ?? null,
        },
      });
      return { content: [{ type: "text", text: JSON.stringify(shapePost(post), null, 2) }] };
    },
  );

  server.registerTool(
    "posting_update",
    {
      title: "Update a scheduled post",
      description:
        "Edit fields on an existing post. Only provided fields are changed. Pass `resetNotified=true` " +
        "after moving publishAt forward so the reminder fires again.",
      inputSchema: {
        id: z.string().min(1),
        title: z.string().min(1).max(200).optional(),
        publishAt: z.string().datetime().optional(),
        platforms: z.array(PlatformSchema).min(1).optional(),
        description: z.string().max(2000).nullable().optional(),
        resetNotified: z.boolean().optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ id, title, publishAt, platforms, description, resetNotified }) => {
      const data: Record<string, unknown> = {};
      if (title !== undefined) data.title = title;
      if (publishAt !== undefined) data.publishAt = new Date(publishAt);
      if (platforms !== undefined) data.platforms = platforms;
      if (description !== undefined) data.description = description;
      if (resetNotified) data.notifiedAt = null;

      if (Object.keys(data).length === 0) {
        return {
          isError: true,
          content: [{ type: "text", text: "No fields provided to update" }],
        };
      }

      try {
        const post = await prisma.scheduledPost.update({ where: { id }, data });
        return { content: [{ type: "text", text: JSON.stringify(shapePost(post), null, 2) }] };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text:
                err instanceof Error && err.message.includes("Record to update not found")
                  ? `No post with id ${id}`
                  : `Update failed: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    },
  );

  server.registerTool(
    "posting_delete",
    {
      title: "Delete a scheduled post",
      description: "Remove a post from the calendar. Idempotent: deleting an unknown id is treated as a no-op.",
      inputSchema: { id: z.string().min(1) },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ id }) => {
      const existing = await prisma.scheduledPost.findUnique({ where: { id } });
      if (!existing) {
        return { content: [{ type: "text", text: JSON.stringify({ deleted: false, id }, null, 2) }] };
      }
      await prisma.scheduledPost.delete({ where: { id } });
      return { content: [{ type: "text", text: JSON.stringify({ deleted: true, id }, null, 2) }] };
    },
  );
}
