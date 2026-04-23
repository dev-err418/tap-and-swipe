"use client";

import { useState, type FormEvent } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" className="animate-[spin_0.8s_steps(8)_infinite]">
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={i}
          x1="9"
          y1="2"
          x2="9"
          y2="5.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity={1 - i * 0.12}
          transform={`rotate(${i * 45} 9 9)`}
        />
      ))}
    </svg>
  );
}

const INTEGRATION_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "newsletter", label: "Newsletter" },
  { value: "youtube", label: "YouTube" },
] as const;

export function PartnershipsForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<string[]>([]);
  const [showIntegrationError, setShowIntegrationError] = useState(false);

  function toggleIntegration(value: string) {
    setIntegrations((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
    setShowIntegrationError(false);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!turnstileToken) return;
    if (integrations.length === 0) {
      setShowIntegrationError(true);
      return;
    }
    setStatus("loading");
    const fd = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/partnerships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: fd.get("firstName"),
          lastName: fd.get("lastName"),
          email: fd.get("email"),
          companyName: fd.get("companyName"),
          companyWebsite: fd.get("companyWebsite"),
          message: fd.get("message"),
          integrations,
          name: fd.get("name"),
          "cf-turnstile-response": turnstileToken,
        }),
      });
      setStatus(res.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "ok") {
    return (
      <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
        Thanks! I&apos;ll review your request and get back to you shortly.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {/* Honeypot */}
      <input
        type="text"
        name="name"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute h-0 w-0 pointer-events-none opacity-0"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-foreground">
            First name <span className="text-red-500">*</span>
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
            className="mt-1.5 h-11 w-full rounded-lg border border-black/15 bg-black/5 px-4 text-sm text-foreground placeholder:text-foreground/30 outline-none transition-colors focus:border-black/40 focus:ring-1 focus:ring-black/40"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-foreground">
            Last name <span className="text-red-500">*</span>
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            autoComplete="family-name"
            className="mt-1.5 h-11 w-full rounded-lg border border-black/15 bg-black/5 px-4 text-sm text-foreground placeholder:text-foreground/30 outline-none transition-colors focus:border-black/40 focus:ring-1 focus:ring-black/40"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          className="mt-1.5 h-11 w-full rounded-lg border border-black/15 bg-black/5 px-4 text-sm text-foreground placeholder:text-foreground/30 outline-none transition-colors focus:border-black/40 focus:ring-1 focus:ring-black/40"
        />
      </div>

      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-foreground">
          Company name <span className="text-red-500">*</span>
        </label>
        <input
          id="companyName"
          name="companyName"
          type="text"
          required
          autoComplete="organization"
          className="mt-1.5 h-11 w-full rounded-lg border border-black/15 bg-black/5 px-4 text-sm text-foreground placeholder:text-foreground/30 outline-none transition-colors focus:border-black/40 focus:ring-1 focus:ring-black/40"
        />
      </div>

      <div>
        <label htmlFor="companyWebsite" className="block text-sm font-medium text-foreground">
          Company website <span className="text-red-500">*</span>
        </label>
        <input
          id="companyWebsite"
          name="companyWebsite"
          type="url"
          required
          autoComplete="url"
          placeholder="https://"
          className="mt-1.5 h-11 w-full rounded-lg border border-black/15 bg-black/5 px-4 text-sm text-foreground placeholder:text-foreground/30 outline-none transition-colors focus:border-black/40 focus:ring-1 focus:ring-black/40"
        />
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-foreground">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder="Tell us about your product, what you're looking for, budget, timing..."
          className="mt-1.5 w-full rounded-lg border border-black/15 bg-black/5 px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 outline-none transition-colors focus:border-black/40 focus:ring-1 focus:ring-black/40 resize-none"
        />
      </div>

      <fieldset>
        <legend className="block text-sm font-medium text-foreground">
          Integration type <span className="text-red-500">*</span>
        </legend>
        <p className="mt-1 text-xs text-foreground/60">Select at least one.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {INTEGRATION_OPTIONS.map((opt) => {
            const checked = integrations.includes(opt.value);
            return (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition-colors ${
                  checked
                    ? "border-black bg-black text-white"
                    : "border-black/15 bg-black/5 text-foreground hover:border-black/30"
                }`}
              >
                <input
                  type="checkbox"
                  value={opt.value}
                  checked={checked}
                  onChange={() => toggleIntegration(opt.value)}
                  className="sr-only"
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
        {showIntegrationError && (
          <p className="mt-2 text-xs text-red-500">Please select at least one integration type.</p>
        )}
      </fieldset>

      <button
        type="submit"
        disabled={status === "loading" || !turnstileToken}
        className="relative h-11 w-full cursor-pointer rounded-full bg-black px-6 text-sm font-bold text-white transition-all hover:bg-black/85 disabled:opacity-50"
      >
        <span className={status === "loading" ? "invisible" : ""}>Submit</span>
        {status === "loading" && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner />
          </span>
        )}
      </button>

      <div className="flex justify-center">
        <Turnstile
          siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
          onSuccess={setTurnstileToken}
          options={{ theme: "light", size: "normal" }}
        />
      </div>

      {status === "error" && (
        <p className="text-xs text-red-500">Something went wrong. Try again.</p>
      )}
    </form>
  );
}
