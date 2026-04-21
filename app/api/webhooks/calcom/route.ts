import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { sendPush } from "@/lib/apns";
import { sendDiscordNotification } from "@/lib/discord-webhook";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-cal-signature-256");

  if (!signature || !process.env.CALCOM_WEBHOOK_SECRET) {
    console.error("[calcom] Missing signature or secret");
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  const expected = crypto
    .createHmac("sha256", process.env.CALCOM_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (signature !== expected) {
    console.error("[calcom] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(body);
  console.log("[calcom] Received:", event.triggerEvent, "metadata:", JSON.stringify(event.payload?.metadata));

  if (event.triggerEvent === "BOOKING_CREATED") {
    const startTime = event.payload?.startTime;
    if (!startTime) {
      console.error("[calcom] No startTime in payload");
      return NextResponse.json({ ok: true });
    }

    // Try metadata first (from URL query params ?metadata[episode_id]=xxx&metadata[type]=xxx)
    let episodeId: string | undefined = event.payload?.metadata?.episode_id;
    let type: string | undefined = event.payload?.metadata?.type;

    // Fallback: match by event type slug against stored booking URLs
    if (!episodeId) {
      const eventSlug = event.payload?.type as string | undefined;
      const introSlug = process.env.CALCOM_INTRO_EVENT_SLUG;
      const recordingSlug = process.env.CALCOM_EVENT_SLUG;

      console.log("[calcom] No metadata.episode_id, trying slug match:", eventSlug);

      if (eventSlug && (eventSlug === introSlug || eventSlug === recordingSlug)) {
        type = eventSlug === introSlug ? "intro" : "recording";
        const urlField = type === "intro" ? "intro_cal_url" : "cal_url";
        const dateField = type === "intro" ? "intro_date" : "recording_date";

        // Find episodes that have a booking link but no date yet (unbooked)
        const { data: candidates } = await supabase
          .from("episodes")
          .select("id, name, pipeline, " + urlField + ", " + dateField)
          .not(urlField, "is", null)
          .is(dateField, null)
          .order("created_at", { ascending: false });

        // The attendee email from the booking
        const attendeeEmail = event.payload?.attendees?.[0]?.email as string | undefined;
        const attendeeName = event.payload?.attendees?.[0]?.name as string | undefined;

        const rows = candidates as unknown as Array<{ id: string; name: string; pipeline: object }>;
        if (rows && rows.length > 0) {
          // Try to match by attendee name against episode name (guest name)
          let match = attendeeName
            ? rows.find((ep) =>
                ep.name.toLowerCase().includes(attendeeName.toLowerCase()) ||
                attendeeName.toLowerCase().includes(ep.name.toLowerCase())
              )
            : undefined;

          // If no name match, pick the most recent unbooked episode
          if (!match) {
            match = rows[0];
            console.log("[calcom] No name match, using most recent unbooked:", match.id);
          } else {
            console.log("[calcom] Matched by name:", match.id);
          }

          episodeId = match.id;
        } else {
          console.log("[calcom] No unbooked episodes found for", urlField);
        }
      }
    }

    if (episodeId) {
      const dateField = type === "intro" ? "intro_date" : "recording_date";
      const pipelineKey = type === "intro" ? "intro_call" : "record";

      const { data: current } = await supabase
        .from("episodes")
        .select("pipeline")
        .eq("id", episodeId)
        .single();

      const updatedPipeline = { ...(current?.pipeline as object ?? {}), [pipelineKey]: "done" };

      const { error } = await supabase
        .from("episodes")
        .update({ [dateField]: startTime, pipeline: updatedPipeline })
        .eq("id", episodeId);

      if (error) {
        console.error("[calcom] Supabase update error:", error.message);
      } else {
        console.log("[calcom] Updated episode", episodeId, ":", dateField, "=", startTime, pipelineKey, "= done");

        // Send push notification
        const { data: ep } = await supabase
          .from("episodes")
          .select("name")
          .eq("id", episodeId)
          .single();
        const guestName = (ep as { name: string } | null)?.name ?? "Unknown";
        const label = type === "intro" ? "Intro call" : "Record call";

        try {
          await sendPush(
            "\u{1F4C5} " + label + " booked",
            guestName
          );
        } catch (pushErr) {
          console.error("[calcom] Push notification failed:", pushErr);
        }
      }
    } else {
      console.log("[calcom] Could not match booking to any episode");
    }

    // ── High-ticket application call notification ──────────────
    const eventSlugRaw = event.payload?.type as string | undefined;
    const appSprintSlug = process.env.CALCOM_COACHING_EVENT_SLUG || "app-sprint-application";

    if (eventSlugRaw === appSprintSlug) {
      const attendee = event.payload?.attendees?.[0];
      const name = attendee?.name || "Unknown";
      const email = attendee?.email || "Unknown";
      const when = startTime
        ? new Date(startTime).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "Unknown";

      // Look up quiz lead for ref + country
      const lead = email !== "Unknown"
        ? await prisma.quizLead.findFirst({
            where: { email: email.toLowerCase() },
            orderBy: { createdAt: "desc" },
          }).catch(() => null)
        : null;

      await sendDiscordNotification(
        "High-Ticket Call Booked",
        `**${name}** booked an application call!`,
        [
          { name: "Name", value: name, inline: true },
          { name: "Email", value: email, inline: true },
          { name: "When", value: when, inline: true },
          { name: "Country", value: lead?.country || "Unknown", inline: true },
          ...(lead?.ref ? [{ name: "Ref", value: lead.ref, inline: true }] : []),
          ...(lead?.budget ? [{ name: "Budget", value: lead.budget, inline: true }] : []),
          ...(lead?.challenge ? [{ name: "Challenge", value: lead.challenge }] : []),
        ],
        0x22c55e,
        process.env.DISCORD_WEBHOOK_LEADS_URL,
      ).catch(() => {});

      try {
        await sendPush("High-Ticket Call Booked", `${name} (${email})`);
      } catch {}
    }
  }

  return NextResponse.json({ ok: true });
}
