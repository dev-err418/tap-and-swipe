import { google, type youtube_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";

export const YT_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

export function getOAuthClient() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "YouTube OAuth env missing. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REDIRECT_URI.",
    );
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getAuthUrl() {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: YT_SCOPES,
  });
}

export async function loadYouTubeAccount() {
  return prisma.platformAccount.findUnique({
    where: { platform: "youtube" },
  });
}

export async function getAuthorizedClient(): Promise<OAuth2Client> {
  const account = await loadYouTubeAccount();
  if (!account?.refreshToken) {
    throw new Error("YouTube is not connected. Visit /learn/posting to connect.");
  }

  const client = getOAuthClient();
  client.setCredentials({
    refresh_token: account.refreshToken,
    access_token: account.accessToken ?? undefined,
    expiry_date: account.expiresAt?.getTime(),
  });

  client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await prisma.platformAccount.update({
        where: { platform: "youtube" },
        data: {
          accessToken: tokens.access_token,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          refreshToken: tokens.refresh_token ?? undefined,
        },
      });
    }
  });

  return client;
}

export async function uploadVideo(opts: {
  title: string;
  description?: string;
  tags?: string[];
  publishAt?: Date;
  videoStream: Readable;
}): Promise<{ videoId: string; url: string }> {
  const auth = await getAuthorizedClient();
  const youtube = google.youtube({ version: "v3", auth });

  const isScheduled = opts.publishAt && opts.publishAt.getTime() > Date.now();

  const requestBody: youtube_v3.Schema$Video = {
    snippet: {
      title: opts.title,
      description: opts.description,
      tags: opts.tags?.length ? opts.tags : undefined,
    },
    status: {
      privacyStatus: isScheduled ? "private" : "public",
      selfDeclaredMadeForKids: false,
      ...(isScheduled && opts.publishAt
        ? { publishAt: opts.publishAt.toISOString() }
        : {}),
    },
  };

  const res = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody,
    media: {
      body: opts.videoStream,
    },
  });

  const videoId = res.data.id;
  if (!videoId) throw new Error("YouTube did not return a video ID");

  return {
    videoId,
    url: `https://youtube.com/watch?v=${videoId}`,
  };
}

export async function getVideoStatus(videoId: string) {
  const auth = await getAuthorizedClient();
  const youtube = google.youtube({ version: "v3", auth });
  const res = await youtube.videos.list({
    id: [videoId],
    part: ["status"],
  });
  return res.data.items?.[0]?.status ?? null;
}
