import { NextResponse } from "next/server";
import { asoPool as pool } from "@/lib/aso-db";

function isDev() {
  return process.env.NODE_ENV === "development";
}

// GET /api/aso/feedback — List all feedback
export async function GET() {
  if (!isDev()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const { rows } = await pool.query(
    "SELECT * FROM aso_feedback ORDER BY created_at DESC"
  );

  return NextResponse.json(rows);
}

// DELETE /api/aso/feedback — Remove a feedback entry
export async function DELETE(req: Request) {
  if (!isDev()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await pool.query("DELETE FROM aso_feedback WHERE id = $1", [id]);

  return NextResponse.json({ deleted: id });
}
