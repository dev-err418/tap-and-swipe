import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSummaryTools } from "@/mcp/tools/summaries";
import { registerPageEventTools } from "@/mcp/tools/page-events";
import { registerWhopTools } from "@/mcp/tools/whop";
import { registerQuizLeadTools } from "@/mcp/tools/quiz-leads";
import { registerSubscriptionTools } from "@/mcp/tools/subscriptions";
import { registerLessonTools } from "@/mcp/tools/lessons";
import { registerNotifyTools } from "@/mcp/tools/notify";
import { registerSchemaResource } from "@/mcp/resources/schema";
import { registerEnumsResource } from "@/mcp/resources/enums";

export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: "tap-and-swipe", version: "0.1.0" },
    {
      capabilities: { tools: {}, resources: {} },
      instructions:
        "Read-only analytics MCP for tap-and-swipe.com. Newsletter funnel uses product='home' " +
        "with type='subscribe' for conversions; community uses product='community' with type='paid'; " +
        "quiz uses product='quiz' plus the QuizLead table. All subscriptions are on Whop. " +
        "PII (emails, names, discord IDs) is masked by default — pass reveal=true to unmask. " +
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
  registerSchemaResource(server);
  registerEnumsResource(server);

  return server;
}
