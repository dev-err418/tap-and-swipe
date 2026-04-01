"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OptinScreen({
  answers,
  profileType,
  source,
  onSuccess,
}: {
  answers: Record<string, number | string>;
  profileType: string;
  source?: string;
  onSuccess: (firstName: string, leadId: string, email: string, phone: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const heading =
    profileType === "scale"
      ? "Last step before booking your call"
      : "Last step before booking your call";
  const subheading =
    profileType === "scale"
      ? "Enter your details to unlock the booking link."
      : "Enter your details to unlock the booking link.";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!firstName.trim()) {
      setError("Your first name is required");
      return;
    }
    if (!EMAIL_REGEX.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/quiz-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          email: email.trim(),
          profileType,
          answers,
          source: source || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      onSuccess(firstName.trim(), data.id, email.trim(), "");
    } catch {
      setError("Something went wrong, please try again");
      setLoading(false);
    }
  }

  const canSubmit =
    !loading &&
    firstName.trim().length > 0 &&
    EMAIL_REGEX.test(email);

  return (
    <div className="flex flex-col items-center text-center max-w-lg mx-auto w-full">
      <h2 className="text-4xl font-extrabold tracking-tight leading-tight sm:text-5xl mb-3 w-[120%]">
        {heading}
      </h2>

      <p className="text-[#c9c4bc] mb-8 text-lg sm:text-xl">
        {subheading}
      </p>

      <form onSubmit={handleSubmit} className="w-full space-y-4">
        <input
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Your first name"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[#f1ebe2] placeholder:text-[#c9c4bc]/40 outline-none focus:border-[#f4cf8f]/50 focus:ring-1 focus:ring-[#f4cf8f]/20"
        />

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[#f1ebe2] placeholder:text-[#c9c4bc]/40 outline-none focus:border-[#f4cf8f]/50 focus:ring-1 focus:ring-[#f4cf8f]/20"
        />

        <p className="text-left text-sm leading-relaxed text-[#c9c4bc]">
          By continuing, you agree to the{" "}
          <a
            href="/app-sprint/privacy"
            target="_blank"
            className="underline underline-offset-2 hover:text-[#f1ebe2]"
          >
            privacy policy
          </a>
          . Non-serious bookings and missed calls are blacklisted.
        </p>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          data-fast-goal="quiz_optin_submit"
          className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f4cf8f] px-8 text-base font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-4"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Continue to booking
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
