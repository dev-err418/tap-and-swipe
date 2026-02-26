const GITHUB_API = "https://api.github.com";

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
}

/**
 * Exchange an OAuth authorization code for an access token.
 * Works with both GitHub Apps and OAuth Apps.
 */
export async function exchangeCode(
  code: string
): Promise<GitHubTokenResponse> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID!,
      client_secret: process.env.GITHUB_CLIENT_SECRET!,
      code,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub token exchange failed: ${text}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(`GitHub token exchange error: ${data.error_description || data.error}`);
  }

  return data;
}

/**
 * Fetch the authenticated GitHub user's profile.
 */
export async function getUser(accessToken: string): Promise<GitHubUser> {
  const res = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub user fetch failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Invite a user to the GitHub org.
 * Uses a PAT with admin:org scope.
 * Returns "invited" | "already_member" | "error".
 */
export async function inviteToOrg(
  username: string
): Promise<"invited" | "already_member" | "error"> {
  const org = process.env.GITHUB_ORG_NAME!;
  const token = process.env.GITHUB_ORG_ADMIN_TOKEN!;

  const res = await fetch(
    `${GITHUB_API}/orgs/${org}/memberships/${username}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({ role: "member" }),
    }
  );

  if (res.ok) {
    const data = await res.json();
    // state is "active" if already a member, "pending" if just invited
    return data.state === "active" ? "already_member" : "invited";
  }

  const text = await res.text();
  console.error(`[inviteToOrg] Failed for ${username}: ${res.status} ${text}`);
  return "error";
}
