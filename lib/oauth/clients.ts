import { prisma } from "@/lib/prisma";
import { constantTimeEquals, sha256Hex } from "@/lib/oauth/crypto";
import { OAuthError } from "@/lib/oauth/errors";

export async function findClient(clientId: string) {
  return prisma.oAuthClient.findUnique({ where: { clientId } });
}

export async function authenticateClient(
  clientId: string,
  clientSecret: string,
): Promise<NonNullable<Awaited<ReturnType<typeof findClient>>>> {
  const client = await findClient(clientId);
  if (!client) {
    throw new OAuthError("invalid_client", "Unknown client_id", 401);
  }
  const providedHash = sha256Hex(clientSecret);
  if (!constantTimeEquals(providedHash, client.clientSecretHash)) {
    throw new OAuthError("invalid_client", "Bad client credentials", 401);
  }
  return client;
}

export function redirectUriAllowed(
  client: { redirectUris: string[] },
  candidate: string,
): boolean {
  if (!candidate) return false;
  if (candidate.includes("#")) return false;
  return client.redirectUris.includes(candidate);
}
