import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "discord_session";
const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);

const TTL_MAP = {
  "10m": { jwt: "10m" as const, cookie: 600 },
  "7d": { jwt: "7d" as const, cookie: 7 * 24 * 60 * 60 },
};

export type SessionTTL = keyof typeof TTL_MAP;

export interface SessionPayload {
  discordId: string;
  discordUsername: string;
  discordAvatar: string | null;
}

export async function createSession(
  payload: SessionPayload,
  ttl: SessionTTL = "10m"
): Promise<void> {
  const { jwt, cookie } = TTL_MAP[ttl];

  const token = await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(jwt)
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: cookie,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
