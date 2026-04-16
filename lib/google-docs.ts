import { OAuth2Client } from "google-auth-library";
import { drive_v3 } from "@googleapis/drive";
import { docs_v1 } from "@googleapis/docs";

function getAuth() {
  const client = new OAuth2Client(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  );
  client.setCredentials({
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  });
  return client;
}

export async function copyTemplateForGuest(
  guestName: string
): Promise<string | null> {
  const templateId = process.env.GOOGLE_DOCS_GUEST_TEMPLATE_ID;
  if (!templateId) {
    console.error("[google-docs] Missing GOOGLE_DOCS_GUEST_TEMPLATE_ID");
    return null;
  }

  const auth = getAuth();
  const drive = new drive_v3.Drive({ auth });
  const docs = new docs_v1.Docs({ auth });

  // 1. Copy the template
  const folderId = process.env.GOOGLE_DOCS_FOLDER_ID;
  const copy = await drive.files.copy({
    fileId: templateId,
    requestBody: {
      name: `Tap & Swipe — Guest Prep: ${guestName}`,
      ...(folderId ? { parents: [folderId] } : {}),
    },
  });

  const docId = copy.data.id!;

  // 2. Replace placeholders with guest name
  await docs.documents.batchUpdate({
    documentId: docId,
    requestBody: {
      requests: [
        {
          replaceAllText: {
            containsText: { text: "{{GUEST_NAME}}", matchCase: true },
            replaceText: guestName,
          },
        },
      ],
    },
  });

  // 3. Make it shareable — anyone with the link can edit
  await drive.permissions.create({
    fileId: docId,
    requestBody: {
      role: "writer",
      type: "anyone",
    },
  });

  return `https://docs.google.com/document/d/${docId}/edit`;
}
