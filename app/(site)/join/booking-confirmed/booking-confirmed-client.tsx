"use client";

import { useEffect, useState } from "react";
import PageTracker from "@/components/PageTracker";

export default function BookingConfirmedClient() {
  const [firstName, setFirstName] = useState("");

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("join_booked_first_name");
      if (saved) setFirstName(saved);
      sessionStorage.removeItem("join_booked_first_name");
      sessionStorage.removeItem("join_quiz");
    } catch {}
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-start px-6 pt-32 pb-12 sm:pt-40">
      <PageTracker product="quiz" />
      <div className="w-full max-w-5xl">
        <div className="px-2 text-center">
          <p className="text-4xl font-bold leading-tight tracking-tight text-black sm:text-6xl">
            You&apos;re booked{firstName ? `, ${firstName}` : ""}.
          </p>
          <p className="mt-4 text-lg text-black/70 sm:text-xl">
            Check your inbox for the calendar invite. Please accept within 24h
            to confirm, unconfirmed slots reopen automatically.
          </p>
        </div>

        <div className="mx-auto mt-6 w-full max-w-xl overflow-hidden rounded-2xl bg-black shadow-sm">
          <video
            src="https://videos.tap-and-swipe.com/join/booked.mp4"
            autoPlay
            muted
            playsInline
            controls
            controlsList="nodownload"
            onContextMenu={(e) => e.preventDefault()}
            preload="metadata"
            className="aspect-video w-full"
          />
        </div>

        <p className="mt-6 text-center text-sm text-black/60">
          Talk soon.
          <br />
          — Arthur
        </p>
      </div>
    </div>
  );
}
