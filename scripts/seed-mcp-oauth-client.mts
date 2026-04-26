import { Pool } from "pg";
import { createHash, randomBytes } from "node:crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CLIENT_ID = "claude-ai-mcp";
const NAME = "claude.ai (MCP connector)";
const REDIRECT_URIS = [
  "https://claude.ai/api/mcp/auth_callback",
  "https://claude.com/api/mcp/auth_callback",
];

const existing = await pool.query<{ clientId: string }>(
  `SELECT "clientId" FROM "OAuthClient" WHERE "clientId" = $1`,
  [CLIENT_ID],
);
if (existing.rows.length > 0) {
  console.log(`Client ${CLIENT_ID} already exists. Use scripts/rotate-mcp-oauth-secret.mts to rotate the secret.`);
  await pool.end();
  process.exit(0);
}

const clientSecret = randomBytes(32).toString("hex");
const clientSecretHash = createHash("sha256").update(clientSecret).digest("hex");

await pool.query(
  `INSERT INTO "OAuthClient" ("clientId", "clientSecretHash", "name", "redirectUris") VALUES ($1, $2, $3, $4)`,
  [CLIENT_ID, clientSecretHash, NAME, REDIRECT_URIS],
);

console.log("\n=== Paste these into claude.ai → Custom integration → Advanced settings ===\n");
console.log(`Client ID:     ${CLIENT_ID}`);
console.log(`Client Secret: ${clientSecret}`);
console.log("\nRaw secret will not be shown again. Save it now.\n");

await pool.end();
