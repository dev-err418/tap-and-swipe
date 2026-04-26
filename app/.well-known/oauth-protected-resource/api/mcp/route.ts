import { NextResponse } from "next/server";
import { protectedResourceMetadata } from "@/lib/oauth/protected-resource-metadata";

export const dynamic = "force-static";
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(protectedResourceMetadata());
}
