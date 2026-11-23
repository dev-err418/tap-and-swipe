import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsViewer } from "@/lib/analytics-session";
import { ANALYTICS_APP_IDS, canAccessAnalyticsApp, type AnalyticsAppId } from "@/lib/analytics-access";
import { listExperiments, createExperiment, updateExperiment, deleteExperiment } from "@/lib/analytics-experiments";
import { platformAnalyticsStorageKey } from "@/lib/versy-analytics-platform";

export const dynamic = "force-dynamic";

async function handle(request: NextRequest) {
  const access = await getAnalyticsViewer();
  if (!access) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const appId = request.nextUrl.searchParams.get("appId") ?? "";
  if (!ANALYTICS_APP_IDS.includes(appId as AnalyticsAppId)) return NextResponse.json({ error: "Invalid appId" }, { status: 400 });
  if (!canAccessAnalyticsApp(access, appId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const storageKey = platformAnalyticsStorageKey(appId, request.nextUrl.searchParams.get("platform"));
  try {
    if (request.method === "GET") return NextResponse.json({ items: await listExperiments(storageKey) }, { headers: { "Cache-Control": "private, no-store" } });
    const input = await request.json().catch(() => null);
    if (!input || typeof input !== "object" || Array.isArray(input)) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    if ((request.method === "POST" || "text" in input) && (typeof input.text !== "string" || !input.text.trim() || input.text.trim().length > 1000)) {
      return NextResponse.json({ error: "Experiment must be between 1 and 1000 characters" }, { status: 400 });
    }
    if (request.method === "POST") return NextResponse.json({ item: await createExperiment(storageKey, input.text.trim()) }, { status: 201 });
    if (typeof input.id !== "string" || !input.id || input.id.length > 100) return NextResponse.json({ error: "Invalid experiment ID" }, { status: 400 });
    if (request.method === "PATCH") {
      if (("completed" in input && typeof input.completed !== "boolean") || !("text" in input || "completed" in input)) {
        return NextResponse.json({ error: "Provide text or a completion status" }, { status: 400 });
      }
      const item = await updateExperiment(storageKey, input.id, {
        ...(typeof input.text === "string" ? { text: input.text.trim() } : {}),
        ...(typeof input.completed === "boolean" ? { completed: input.completed } : {}),
      });
      return item ? NextResponse.json({ item }) : NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const deleted = await deleteExperiment(storageKey, input.id);
    return deleted ? NextResponse.json({ id: input.id }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch {
    console.error("analytics_experiments_storage_failed", { appId, method: request.method });
    return NextResponse.json({ error: "Experiments are temporarily unavailable. Please try again." }, { status: 503 });
  }
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
