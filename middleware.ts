import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);
const SESSION_COOKIE = "discord_session";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.redirect(
      new URL("/api/auth/discord?redirect=roadmap", request.url)
    );
  }

  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(
      new URL("/api/auth/discord?redirect=roadmap", request.url)
    );
  }
}

export const config = {
  matcher: "/app-sprint/roadmap/:path*",
};
