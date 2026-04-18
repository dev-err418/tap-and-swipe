import { NextResponse } from "next/server";

const SHARE_WEBHOOK =
  "https://discord.com/api/webhooks/1494992214059778129/OEqO724JzXA_4qV3Fet-nFiGY1iwHasGUsmsldGxqzxHhGtXNsvPZv0T_FBN1SVMfNWQ";

export async function POST(req: Request) {
  const { appLink, story, contact, name } = await req.json();

  // Honeypot: bots fill the hidden "name" field, real users don't
  if (name) {
    return NextResponse.json({ ok: true });
  }

  if (
    !appLink || typeof appLink !== "string" ||
    !story || typeof story !== "string" ||
    !contact || typeof contact !== "string"
  ) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  // Reject if story or contact are too short to be meaningful
  if (story.trim().length < 10 || contact.trim().length < 3) {
    return NextResponse.json({ ok: true }); // silent reject
  }

  try {
    await fetch(SHARE_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: "New Share Your Story submission",
            color: 0x7c3aed,
            fields: [
              { name: "App Link", value: appLink },
              { name: "Story", value: story },
              { name: "Contact", value: contact },
            ],
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });
  } catch (err) {
    console.error("Share Discord webhook error:", err);
    return NextResponse.json(
      { error: "Failed to submit" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
