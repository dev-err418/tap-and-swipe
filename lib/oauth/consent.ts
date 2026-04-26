import { SignJWT, jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET!);

export interface ConsentPayload {
  clientId: string;
  redirectUri: string;
  state: string | null;
  codeChallenge: string;
  scope: string | null;
  resource: string;
  discordId: string;
}

export async function signConsentToken(p: ConsentPayload): Promise<string> {
  return new SignJWT(p as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(SECRET);
}

export async function verifyConsentToken(token: string): Promise<ConsentPayload> {
  const { payload } = await jwtVerify(token, SECRET);
  return payload as unknown as ConsentPayload;
}
