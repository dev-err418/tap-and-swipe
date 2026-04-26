import type { NextRequest } from "next/server";
import { authenticateClient } from "@/lib/oauth/clients";
import { OAuthError, jsonError } from "@/lib/oauth/errors";
import { sha256Hex } from "@/lib/oauth/crypto";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (!ct.toLowerCase().startsWith("application/x-www-form-urlencoded")) {
      throw new OAuthError(
        "invalid_request",
        "Content-Type must be application/x-www-form-urlencoded",
      );
    }
    const form = await req.formData();
    const token = form.get("token");
    const clientId = form.get("client_id");
    const clientSecret = form.get("client_secret");

    if (typeof clientId !== "string" || typeof clientSecret !== "string") {
      throw new OAuthError("invalid_client", "Missing client credentials", 401);
    }
    const client = await authenticateClient(clientId, clientSecret);

    if (typeof token !== "string" || token.length === 0) {
      // RFC 7009 §2.2 — return 200 even if the token was never issued.
      return new Response(null, { status: 200, headers: { "Cache-Control": "no-store" } });
    }
    const tokenHash = sha256Hex(token);

    await prisma.$transaction([
      prisma.oAuthAccessToken.updateMany({
        where: { tokenHash, clientId: client.clientId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.oAuthRefreshToken.updateMany({
        where: { tokenHash, clientId: client.clientId, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
    ]);

    return new Response(null, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof OAuthError) return jsonError(e);
    console.error("[oauth/revoke] unhandled", e);
    return jsonError(new OAuthError("server_error", "Internal error", 500));
  }
}
