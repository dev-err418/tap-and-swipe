import { google } from "googleapis";

function getCredentials() {
  const base64 = process.env.GOOGLE_DOCS_SERVICE_ACCOUNT_JSON ?? process.env.GOOGLE_SERVICE_ACCOUNT_JSON!;
  const json = Buffer.from(base64, "base64").toString("utf-8");
  return JSON.parse(json);
}

function getAuth() {
  const credentials = getCredentials();
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/documents",
    ],
  });
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
  const drive = google.drive({ version: "v3", auth });
  const docs = google.docs({ version: "v1", auth });

  // 1. Copy the template
  const copy = await drive.files.copy({
    fileId: templateId,
    requestBody: {
      name: `Tap & Swipe — Guest Prep: ${guestName}`,
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
