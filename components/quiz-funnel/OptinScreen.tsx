"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { isValidPhoneNumber, parsePhoneNumber } from "react-phone-number-input";
import type { Country } from "react-phone-number-input";
import type { E164Number } from "libphonenumber-js/core";
import PhoneInput from "./PhoneInput";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OptinScreen({
  answers,
  profileType,
  source,
  onSuccess,
}: {
  answers: Record<string, number>;
  profileType: "dev-indie" | "entreprise";
  source?: string;
  onSuccess: (firstName: string, leadId: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<Country>("US");
  const [phoneValue, setPhoneValue] = useState<E164Number | undefined>();
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    if (!phoneValue || !isValidPhoneNumber(phoneValue)) {
      setError("Please enter a valid phone number");
      return;
    }
    if (!consent) {
      setError("You must accept the privacy policy");
      return;
    }

    setLoading(true);

    try {
      const parsed = parsePhoneNumber(phoneValue);
      const res = await fetch("/api/quiz-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          email: email.trim(),
          phone: parsed?.nationalNumber || "",
          countryCode: parsed ? `+${parsed.countryCallingCode}` : "+1",
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

      onSuccess(firstName.trim(), data.id);
    } catch {
      setError("Something went wrong, please try again");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center text-center max-w-lg mx-auto w-full">
      <h2 className="text-4xl font-extrabold tracking-tight leading-tight sm:text-5xl mb-3 w-[120%]">
        Last step before getting your personalized action plan 👇
      </h2>

      <p className="text-[#c9c4bc] mb-8 text-lg sm:text-xl">
        Enter your details to access your results.
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

        <PhoneInput
          country={phoneCountry}
          value={phoneValue}
          onCountryChange={setPhoneCountry}
          onChange={setPhoneValue}
        />

        <label className="flex items-start gap-3 text-left cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-[#f4cf8f]"
          />
          <span className="text-sm text-[#c9c4bc]">
            I agree to the{" "}
            <a
              href="/app-sprint/privacy"
              target="_blank"
              className="underline underline-offset-2 hover:text-[#f1ebe2]"
            >
              privacy policy
            </a>{" "}
            and to being contacted by email and phone.
          </span>
        </label>

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          data-fast-goal="quiz_optin_submit"
          className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#f4cf8f] px-8 text-base font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-4"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              See my results
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
