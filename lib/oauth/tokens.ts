import { prisma } from "@/lib/prisma";
import { randomToken, sha256Hex } from "@/lib/oauth/crypto";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  AUTH_CODE_TTL_SECONDS,
  OAUTH_RESOURCE,
} from "@/lib/oauth/config";
import { OAuthError } from "@/lib/oauth/errors";
import { randomUUID } from "node:crypto";

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string | null;
  tokenType: "Bearer";
}

interface IssueParams {
  clientId: string;
  userId: string;
  scope: string | null;
  resource: string;
  familyId?: string;
}

export async function issueTokens(params: IssueParams): Promise<IssuedTokens> {
  const accessToken = randomToken();
  const refreshToken = randomToken();
  const familyId = params.familyId ?? randomUUID();
  const now = Date.now();

  await prisma.$transaction([
    prisma.oAuthAccessToken.create({
      data: {
        tokenHash: sha256Hex(accessToken),
        clientId: params.clientId,
        userId: params.userId,
        scope: params.scope,
        resource: params.resource,
        expiresAt: new Date(now + ACCESS_TOKEN_TTL_SECONDS * 1000),
        familyId,
      },
    }),
    prisma.oAuthRefreshToken.create({
      data: {
        tokenHash: sha256Hex(refreshToken),
        clientId: params.clientId,
        userId: params.userId,
        scope: params.scope,
        resource: params.resource,
        expiresAt: new Date(now + REFRESH_TOKEN_TTL_SECONDS * 1000),
        familyId,
      },
    }),
  ]);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    scope: params.scope,
    tokenType: "Bearer",
  };
}

export async function mintAuthorizationCode(args: {
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string | null;
  resource: string;
}): Promise<string> {
  const code = randomToken();
  await prisma.oAuthAuthorizationCode.create({
    data: {
      codeHash: sha256Hex(code),
      clientId: args.clientId,
      userId: args.userId,
      redirectUri: args.redirectUri,
      codeChallenge: args.codeChallenge,
      scope: args.scope,
      resource: args.resource,
      expiresAt: new Date(Date.now() + AUTH_CODE_TTL_SECONDS * 1000),
    },
  });
  return code;
}

export async function consumeAuthorizationCode(code: string) {
  const codeHash = sha256Hex(code);

  // Atomic claim: only the first concurrent caller flips consumedAt and gets the row back.
  // updateMany with a WHERE on consumedAt IS NULL is the closed-system equivalent of
  // SELECT ... FOR UPDATE; the rowcount tells us whether we won the race.
  const consumed = await prisma.oAuthAuthorizationCode.updateMany({
    where: { codeHash, consumedAt: null, expiresAt: { gt: new Date() } },
    data: { consumedAt: new Date() },
  });

  if (consumed.count === 0) {
    // Either: not found, expired, or already consumed. Discriminate for accurate errors
    // and so we can run the RFC 6749 §10.5 replay-revocation in the consumed-already case.
    const record = await prisma.oAuthAuthorizationCode.findUnique({ where: { codeHash } });
    if (!record) {
      throw new OAuthError("invalid_grant", "Authorization code not found");
    }
    if (record.expiresAt < new Date()) {
      await prisma.oAuthAuthorizationCode.delete({ where: { codeHash } });
      throw new OAuthError("invalid_grant", "Authorization code expired");
    }
    // consumedAt was already set → replay. Revoke any tokens issued under it.
    await prisma.oAuthAccessToken.updateMany({
      where: {
        clientId: record.clientId,
        userId: record.userId,
        createdAt: { gte: record.createdAt },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    throw new OAuthError("invalid_grant", "Authorization code already used");
  }

  // We won — re-read the row to return the bound parameters.
  const record = await prisma.oAuthAuthorizationCode.findUnique({ where: { codeHash } });
  if (!record) {
    // Should never happen — we just updated it.
    throw new OAuthError("server_error", "Code consumed but not found", 500);
  }
  return record;
}

export async function rotateRefreshToken(presented: string, requestingClientId: string) {
  const tokenHash = sha256Hex(presented);

  // Atomic claim — only the first concurrent caller flips consumedAt.
  const claimed = await prisma.oAuthRefreshToken.updateMany({
    where: {
      tokenHash,
      consumedAt: null,
      expiresAt: { gt: new Date() },
      clientId: requestingClientId,
    },
    data: { consumedAt: new Date() },
  });

  if (claimed.count === 0) {
    // Did not win the atomic claim. Find out why.
    const record = await prisma.oAuthRefreshToken.findUnique({ where: { tokenHash } });
    if (!record) {
      throw new OAuthError("invalid_grant", "Refresh token not recognized");
    }
    if (record.clientId !== requestingClientId) {
      // Refresh token belongs to a different client — treat as compromise of the family.
      await revokeFamily(record.familyId);
      throw new OAuthError("invalid_grant", "Refresh token client mismatch");
    }
    if (record.expiresAt <= new Date()) {
      throw new OAuthError("invalid_grant", "Refresh token expired");
    }
    if (record.consumedAt) {
      // Replay → revoke entire family (OAuth 2.1 §4.3.1).
      await revokeFamily(record.familyId);
      throw new OAuthError(
        "invalid_grant",
        "Refresh token already consumed — chain revoked",
      );
    }
    throw new OAuthError("invalid_grant", "Refresh token rejected");
  }

  // Re-read the now-consumed row to mint the next pair from its bindings.
  const record = await prisma.oAuthRefreshToken.findUnique({ where: { tokenHash } });
  if (!record) {
    throw new OAuthError("server_error", "Refresh consumed but not found", 500);
  }

  const next = await issueTokens({
    clientId: record.clientId,
    userId: record.userId,
    scope: record.scope,
    resource: record.resource,
    familyId: record.familyId,
  });

  await prisma.oAuthRefreshToken.update({
    where: { tokenHash },
    data: { replacedByHash: sha256Hex(next.refreshToken) },
  });

  return next;
}

async function revokeFamily(familyId: string): Promise<void> {
  await prisma.$transaction([
    prisma.oAuthAccessToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.oAuthRefreshToken.updateMany({
      where: { familyId, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
  ]);
}

export interface VerifiedAccessToken {
  clientId: string;
  userId: string;
  scope: string | null;
  resource: string;
  expiresAt: Date;
}

export async function verifyAccessToken(
  token: string,
  expectedResource: string = OAUTH_RESOURCE,
): Promise<VerifiedAccessToken> {
  const tokenHash = sha256Hex(token);
  const record = await prisma.oAuthAccessToken.findUnique({
    where: { tokenHash },
  });
  if (!record) {
    throw new OAuthError("invalid_token", "Token not recognized", 401);
  }
  if (record.revokedAt) {
    throw new OAuthError("invalid_token", "Token revoked", 401);
  }
  if (record.expiresAt < new Date()) {
    throw new OAuthError("invalid_token", "Token expired", 401);
  }
  if (record.resource !== expectedResource) {
    // RFC 8707 audience binding.
    throw new OAuthError("invalid_token", "Token audience mismatch", 401);
  }
  return {
    clientId: record.clientId,
    userId: record.userId,
    scope: record.scope,
    resource: record.resource,
    expiresAt: record.expiresAt,
  };
}
