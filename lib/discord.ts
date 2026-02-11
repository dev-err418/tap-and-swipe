const DISCORD_API = "https://discord.com/api/v10";

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  discriminator: string;
  global_name: string | null;
}

export async function exchangeCode(
  code: string,
  redirectUri: string
): Promise<DiscordTokenResponse> {
  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord token exchange failed: ${text}`);
  }

  return res.json();
}

export async function getUser(accessToken: string): Promise<DiscordUser> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Discord user fetch failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Add a user to the guild using their OAuth2 access token.
 * Returns true if the user was added (201) or already in the guild (204).
 * Returns false if the access token is invalid/expired.
 */
export async function addToGuild(
  discordUserId: string,
  accessToken: string
): Promise<boolean> {
  const res = await fetch(
    `${DISCORD_API}/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordUserId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_token: accessToken,
        roles: [process.env.DISCORD_ROLE_ID],
      }),
    }
  );

  if (res.status === 201) {
    // User was added to the guild (with role)
    return true;
  }

  if (res.status === 204) {
    // User was already in the guild — role not set via this endpoint
    return true;
  }

  const text = await res.text();
  console.warn(
    `[addToGuild] Failed for user ${discordUserId}: ${res.status} ${text}`
  );
  return false;
}

export async function addRole(discordUserId: string): Promise<boolean> {
  const res = await fetch(
    `${DISCORD_API}/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordUserId}/roles/${process.env.DISCORD_ROLE_ID}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (res.status === 404) {
    console.warn(`[addRole] Discord returned 404 for user ${discordUserId} — user is not in the guild`);
    return false;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord addRole failed: ${res.status} ${text}`);
  }

  return true;
}

export async function removeRole(discordUserId: string): Promise<boolean> {
  const res = await fetch(
    `${DISCORD_API}/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordUserId}/roles/${process.env.DISCORD_ROLE_ID}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (res.status === 404) {
    console.warn(`[removeRole] Discord returned 404 for user ${discordUserId} — user is not in the guild`);
    return false;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord removeRole failed: ${res.status} ${text}`);
  }

  return true;
}
