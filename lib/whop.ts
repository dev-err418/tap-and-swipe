import { Whop } from "@whop/sdk";

let _whop: Whop | null = null;

export function getWhop(): Whop {
  if (!_whop) {
    _whop = new Whop({
      apiKey: process.env.WHOP_API_KEY,
      webhookKey: process.env.WHOP_WEBHOOK_SECRET,
    });
  }
  return _whop;
}

export const WHOP_COMMUNITY_PLAN_ID =
  process.env.WHOP_COMMUNITY_PLAN_ID ?? "plan_EmwyCxO8l96me";
