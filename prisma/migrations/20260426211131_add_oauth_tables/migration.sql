-- OAuth 2.1 storage for the MCP server (auth server + resource server, single tenant).
-- Tokens and codes are stored as SHA-256 hashes; raw values never persisted.

CREATE TABLE "OAuthClient" (
  "clientId"         TEXT      PRIMARY KEY,
  "clientSecretHash" TEXT      NOT NULL,
  "name"             TEXT      NOT NULL,
  "redirectUris"     TEXT[]    NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "OAuthAuthorizationCode" (
  "codeHash"      TEXT      PRIMARY KEY,
  "clientId"      TEXT      NOT NULL,
  "userId"        TEXT      NOT NULL,
  "redirectUri"   TEXT      NOT NULL,
  "codeChallenge" TEXT      NOT NULL,
  "scope"         TEXT,
  "resource"      TEXT      NOT NULL,
  "expiresAt"     TIMESTAMP(3) NOT NULL,
  "consumedAt"    TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "OAuthAuthorizationCode_expiresAt_idx" ON "OAuthAuthorizationCode"("expiresAt");

CREATE TABLE "OAuthAccessToken" (
  "tokenHash" TEXT      PRIMARY KEY,
  "clientId"  TEXT      NOT NULL,
  "userId"    TEXT      NOT NULL,
  "scope"     TEXT,
  "resource"  TEXT      NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "familyId"  TEXT      NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "OAuthAccessToken_expiresAt_idx" ON "OAuthAccessToken"("expiresAt");
CREATE INDEX "OAuthAccessToken_familyId_idx"  ON "OAuthAccessToken"("familyId");

CREATE TABLE "OAuthRefreshToken" (
  "tokenHash"      TEXT      PRIMARY KEY,
  "clientId"       TEXT      NOT NULL,
  "userId"         TEXT      NOT NULL,
  "scope"          TEXT,
  "resource"       TEXT      NOT NULL,
  "expiresAt"      TIMESTAMP(3) NOT NULL,
  "consumedAt"     TIMESTAMP(3),
  "replacedByHash" TEXT,
  "familyId"       TEXT      NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "OAuthRefreshToken_expiresAt_idx" ON "OAuthRefreshToken"("expiresAt");
CREATE INDEX "OAuthRefreshToken_familyId_idx"  ON "OAuthRefreshToken"("familyId");
