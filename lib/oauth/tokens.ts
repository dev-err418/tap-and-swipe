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
  const record = await prisma.oAuthAuthorizationCode.findUnique({
    where: { codeHash },
  });
  if (!record) {
    throw new OAuthError("invalid_grant", "Authorization code not found");
  }
  if (record.expiresAt < new Date()) {
    await prisma.oAuthAuthorizationCode.delete({ where: { codeHash } });
    throw new OAuthError("invalid_grant", "Authorization code expired");
  }
  if (record.consumedAt) {
    // Per RFC 6749 §10.5: replay → revoke any tokens already issued from this code.
    await prisma.oAuthAccessToken.updateMany({
      where: { clientId: record.clientId, userId: record.userId, createdAt: { gte: record.createdAt } },
      data: { revokedAt: new Date() },
    });
    throw new OAuthError("invalid_grant", "Authorization code already used");
  }
  await prisma.oAuthAuthorizationCode.update({
    where: { codeHash },
    data: { consumedAt: new Date() },
  });
  return record;
}

export async function rotateRefreshToken(presented: string) {
  const tokenHash = sha256Hex(presented);
  const record = await prisma.oAuthRefreshToken.findUnique({
    where: { tokenHash },
  });
  if (!record) {
    throw new OAuthError("invalid_grant", "Refresh token not recognized");
  }
  if (record.expiresAt < new Date()) {
    throw new OAuthError("invalid_grant", "Refresh token expired");
  }
  if (record.consumedAt) {
    // Replay detection — revoke entire family.
    await prisma.$transaction([
      prisma.oAuthAccessToken.updateMany({
        where: { familyId: record.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.oAuthRefreshToken.updateMany({
        where: { familyId: record.familyId, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
    ]);
    throw new OAuthError(
      "invalid_grant",
      "Refresh token already consumed — chain revoked",
    );
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
    data: {
      consumedAt: new Date(),
      replacedByHash: sha256Hex(next.refreshToken),
    },
  });

  return next;
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
