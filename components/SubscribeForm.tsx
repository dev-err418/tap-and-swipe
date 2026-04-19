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

export function SubscribeForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const website = fd.get("website") as string;

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });
      setStatus(res.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "ok") {
    return <p className="mt-10 text-sm font-medium text-emerald-600">Check your inbox! Welcome in.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 mx-auto flex w-full max-w-sm flex-col gap-2">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute h-0 w-0 pointer-events-none opacity-0"
      />
      <div className="flex h-12 rounded-full border border-black/15 bg-black/5 transition-colors focus-within:border-black/40 focus-within:ring-1 focus-within:ring-black/40">
        <input
          type="email"
          name="email"
          placeholder="you@email.com"
          required
          className="h-full flex-1 rounded-full bg-transparent px-5 text-sm text-black placeholder:text-black/30 outline-none"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="relative -my-px -mr-px h-[calc(100%+2px)] shrink-0 cursor-pointer rounded-full bg-black px-5 text-sm font-bold text-white transition-all hover:bg-black/85 disabled:opacity-50"
        >
          <span className={status === "loading" ? "invisible" : ""}>Subscribe</span>
          {status === "loading" && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Spinner />
            </span>
          )}
        </button>
      </div>
      {status === "error" && <p className="pl-5 text-xs text-red-500">Something went wrong. Try again.</p>}
      <p className="pl-5 text-xs text-black/60">
        One email per episode. No spam, ever.{" "}
        <a href="/privacy" className="underline hover:text-black/70">
          Privacy
        </a>
      </p>
    </form>
  );
}
