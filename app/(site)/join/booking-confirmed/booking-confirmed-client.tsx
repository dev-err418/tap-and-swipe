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
    <div
      className="-mt-[var(--navbar-h)] flex min-h-dvh flex-col items-center justify-center px-6 py-16"
      style={{ "--navbar-h": "68px" } as React.CSSProperties}
    >
      <PageTracker product="quiz" />
      <div className="w-full max-w-xl rounded-3xl border border-black/10 bg-white px-8 py-12 text-center shadow-sm sm:px-12">
        <p className="text-3xl font-bold leading-tight tracking-tight text-black sm:text-4xl">
          You&apos;re booked{firstName ? `, ${firstName}` : ""}.
        </p>
        <p className="mt-5 text-base text-black/70">
          Check your inbox for the calendar invite.
        </p>
        <p className="mt-4 text-sm text-black/55">
          Please accept the invite within 24h to confirm. Unconfirmed slots
          reopen automatically.
        </p>
        <p className="mt-8 text-sm text-black/60">
          Talk soon.
          <br />
          — Arthur
        </p>
      </div>
    </div>
  );
}
