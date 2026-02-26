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

/**
 * Add a user to the guild with multiple roles.
 * If user is already in guild (204), falls back to assigning each role individually.
 */
export async function addToGuildWithRoles(
  discordUserId: string,
  accessToken: string,
  roleIds: string[]
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
        roles: roleIds,
      }),
    }
  );

  if (res.status === 201) return true;

  if (res.status === 204) {
    // Already in guild — assign roles individually
    await Promise.all(roleIds.map((id) => addRoleById(discordUserId, id)));
    return true;
  }

  const text = await res.text();
  console.warn(`[addToGuildWithRoles] Failed for user ${discordUserId}: ${res.status} ${text}`);
  return false;
}

export async function addRoleById(
  discordUserId: string,
  roleId: string
): Promise<boolean> {
  const res = await fetch(
    `${DISCORD_API}/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordUserId}/roles/${roleId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (res.status === 404) {
    console.warn(`[addRoleById] Discord returned 404 for user ${discordUserId} role ${roleId}`);
    return false;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord addRoleById failed: ${res.status} ${text}`);
  }
  return true;
}

/**
 * Create a private text channel under the SUPPORT category.
 * Only the admin and the target user can see it.
 */
export async function createPrivateChannel(
  discordUserId: string,
  channelName: string
): Promise<string> {
  const guildId = process.env.DISCORD_GUILD_ID!;
  const categoryId = process.env.DISCORD_SUPPORT_CATEGORY_ID!;
  const adminId = process.env.ADMIN_DISCORD_ID!;

  // @everyone role ID equals the guild ID in Discord
  const everyoneRoleId = guildId;

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: channelName,
      type: 0, // text channel
      parent_id: categoryId,
      permission_overwrites: [
        {
          id: everyoneRoleId,
          type: 0, // role
          deny: "1024", // VIEW_CHANNEL
        },
        {
          id: adminId,
          type: 1, // member
          allow: "68608", // VIEW_CHANNEL | SEND_MESSAGES | READ_MESSAGE_HISTORY
        },
        {
          id: discordUserId,
          type: 1, // member
          allow: "68608",
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord createPrivateChannel failed: ${res.status} ${text}`);
  }

  const channel = await res.json();
  return channel.id;
}

export async function sendChannelMessage(
  channelId: string,
  content: string,
  suppressEmbeds?: boolean
): Promise<void> {
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      ...(suppressEmbeds && { flags: 4 }),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord sendChannelMessage failed: ${res.status} ${text}`);
  }
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
