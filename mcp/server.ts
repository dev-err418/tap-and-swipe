import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSummaryTools } from "@/mcp/tools/summaries";
import { registerPageEventTools } from "@/mcp/tools/page-events";
import { registerWhopTools } from "@/mcp/tools/whop";
import { registerQuizLeadTools } from "@/mcp/tools/quiz-leads";
import { registerSubscriptionTools } from "@/mcp/tools/subscriptions";
import { registerLessonTools } from "@/mcp/tools/lessons";
import { registerNotifyTools } from "@/mcp/tools/notify";
import { registerPostingTools } from "@/mcp/tools/posting";
import { registerSchemaResource } from "@/mcp/resources/schema";
import { registerEnumsResource } from "@/mcp/resources/enums";

export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: "tap-and-swipe", version: "0.1.0" },
    {
      capabilities: { tools: {}, resources: {} },
      instructions:
        "Analytics + content-calendar MCP for tap-and-swipe.com. Newsletter funnel uses product='home' " +
        "with type='subscribe' for conversions; community uses product='community' with type='paid'; " +
        "quiz uses product='quiz' plus the QuizLead table. All subscriptions are on Whop. " +
        "PII (emails, names, discord IDs) is masked by default, pass reveal=true to unmask. " +
        "Course content (categories + lessons + notes) is exposed via course_outline. " +
        "Posting calendar is read/write via posting_list/posting_create/posting_update/posting_delete; " +
        "valid platforms are linkedin, youtube-long, youtube-shorts, instagram-reels (a reminder push " +
        "fires automatically when publishAt is reached). " +
        "Read the taprm://enums/page-events resource before composing tool inputs.",
    },
  );

  registerSummaryTools(server);
  registerPageEventTools(server);
  registerWhopTools(server);
  registerQuizLeadTools(server);
  registerSubscriptionTools(server);
  registerLessonTools(server);
  registerNotifyTools(server);
  registerPostingTools(server);
  registerSchemaResource(server);
  registerEnumsResource(server);

  return server;
}
