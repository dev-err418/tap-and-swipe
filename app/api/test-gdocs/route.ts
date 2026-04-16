import { NextResponse } from "next/server";
import { copyTemplateForGuest } from "@/lib/google-docs";

export async function GET() {
  const hasKey = !!process.env.GOOGLE_DOCS_SERVICE_ACCOUNT_JSON;
  const hasTemplate = !!process.env.GOOGLE_DOCS_GUEST_TEMPLATE_ID;

  if (!hasKey || !hasTemplate) {
    return NextResponse.json({
      error: "Missing env vars",
      GOOGLE_DOCS_SERVICE_ACCOUNT_JSON: hasKey,
      GOOGLE_DOCS_GUEST_TEMPLATE_ID: hasTemplate,
    }, { status: 500 });
  }

  try {
    const docUrl = await copyTemplateForGuest("Test Guest (delete me)");
    return NextResponse.json({ ok: true, docUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
