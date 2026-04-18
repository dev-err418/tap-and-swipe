"use client";

import { useState, type FormEvent } from "react";

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

export function ShareForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const fd = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appLink: fd.get("appLink"),
          story: fd.get("story"),
          contact: fd.get("contact"),
          name: fd.get("name"),
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
        Got it! I&apos;ll review your submission and reach out if it&apos;s a fit.
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

      <div>
        <label htmlFor="appLink" className="block text-sm font-medium text-foreground">
          App Store / Play Store link
        </label>
        <input
          id="appLink"
          name="appLink"
          type="url"
          required
          placeholder="https://apps.apple.com/app/..."
          className="mt-1.5 h-11 w-full rounded-lg border border-black/15 bg-black/5 px-4 text-sm text-foreground placeholder:text-foreground/30 outline-none transition-colors focus:border-black/40 focus:ring-1 focus:ring-black/40"
        />
      </div>

      <div>
        <label htmlFor="story" className="block text-sm font-medium text-foreground">
          One sentence about your story
        </label>
        <textarea
          id="story"
          name="story"
          required
          rows={3}
          placeholder="e.g. I built a habit tracker that hit 10K users while working full-time as a teacher"
          className="mt-1.5 w-full rounded-lg border border-black/15 bg-black/5 px-4 py-3 text-sm text-foreground placeholder:text-foreground/30 outline-none transition-colors focus:border-black/40 focus:ring-1 focus:ring-black/40 resize-none"
        />
      </div>

      <div>
        <label htmlFor="contact" className="block text-sm font-medium text-foreground">
          Best way to reach you
        </label>
        <input
          id="contact"
          name="contact"
          type="text"
          required
          placeholder="email, LinkedIn, X..."
          className="mt-1.5 h-11 w-full rounded-lg border border-black/15 bg-black/5 px-4 text-sm text-foreground placeholder:text-foreground/30 outline-none transition-colors focus:border-black/40 focus:ring-1 focus:ring-black/40"
        />
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="relative h-11 w-full cursor-pointer rounded-full bg-black px-6 text-sm font-bold text-white transition-all hover:bg-black/85 disabled:opacity-50"
      >
        <span className={status === "loading" ? "invisible" : ""}>Submit</span>
        {status === "loading" && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner />
          </span>
        )}
      </button>

      {status === "error" && (
        <p className="text-xs text-red-500">Something went wrong. Try again.</p>
      )}
    </form>
  );
}
