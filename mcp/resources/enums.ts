import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const ENUM_BODY = {
  pageEvent: {
    products: [
      "home",
      "community",
      "quiz",
      "coaching",
      "aso",
      "aso-solo",
      "aso-pro",
      "starter",
      "bundle-aso",
      "bundle-community",
    ],
    types: [
      "page_view",
      "cta_clicked",
      "stripe_shown",
      "paid",
      "trial_started",
      "quiz_start",
      "quiz_complete",
      "subscribe",
    ],
    notes: {
      "newsletter signup conversion": "product='home', type='subscribe'",
      "community paid conversion": "product='community', type='paid'",
      "quiz funnel": "product='quiz', types in [page_view, quiz_start, quiz_complete]; QuizLead row also written for completes",
    },
  },
  quizLead: {
    hasApp: ["revenue", "no-revenue", "no"],
    businessType: ["individual", "business"],
    budget: ["under-500", "500-2000", "2000-plus"],
    route: ["coaching", "community"],
  },
  user: {
    tier: ["full", "starter", null],
    subscriptionStatus: ["active", "past_due", "canceled", null],
    paymentProvider: ["whop", "stripe", null],
  },
};

export function registerEnumsResource(server: McpServer) {
  server.registerResource(
    "enums",
    "taprm://enums/page-events",
    {
      title: "Canonical enums",
      description:
        "Allowed values for PageEvent.product, PageEvent.type, QuizLead segment fields, and User subscription/tier fields. Read this before composing tool inputs.",
      mimeType: "application/json",
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(ENUM_BODY, null, 2),
        },
      ],
    }),
  );
}
