"use client";

import { useState, type FormEvent } from "react";
import { fire, getVisitorId, getSessionId } from "./PageTracker";

type Status = "idle" | "loading" | "ok" | "already" | "error";

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
  const [status, setStatus] = useState<Status>("idle");

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
      if (!res.ok) {
        setStatus("error");
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { alreadySubscribed?: boolean };
      if (!data.alreadySubscribed) {
        fire("home", "subscribe", getVisitorId(), getSessionId("home"));
      }
      setStatus(data.alreadySubscribed ? "already" : "ok");
    } catch {
      setStatus("error");
    }
  }

  const finished = status === "ok" || status === "already";

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
      {finished ? (
        <div
          className={`flex h-12 items-center justify-center px-5 text-center text-sm font-medium ${
            status === "ok" ? "text-black" : "text-black/70"
          }`}
        >
          {status === "ok"
            ? "Thank you for signing up, check your inbox!"
            : "You're already on the list."}
        </div>
      ) : (
        <div className="flex h-12 rounded-full border border-black/15 bg-black/5 transition-colors focus-within:border-black/40 focus-within:ring-1 focus-within:ring-black/40">
          <input
            type="email"
            name="email"
            placeholder="your-best-email@email.com"
            required
            className="h-full flex-1 rounded-full bg-transparent px-5 text-sm text-black placeholder:text-black/30 outline-none"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="relative -my-px -mr-px h-[calc(100%+2px)] shrink-0 cursor-pointer rounded-full bg-black px-5 text-sm font-bold text-white transition-all hover:bg-black/85 disabled:opacity-50"
          >
            <span className={status === "loading" ? "invisible" : ""}>Send it</span>
            {status === "loading" && (
              <span className="absolute inset-0 flex items-center justify-center">
                <Spinner />
              </span>
            )}
          </button>
        </div>
      )}
      {status === "error" && <p className="pl-5 text-xs text-red-500">Something went wrong. Try again.</p>}
      <p
        aria-hidden={finished}
        className={`pl-5 text-xs text-black/60 ${finished ? "invisible" : ""}`}
      >
        I write it myself. No ghostwriter, no AI slop.
      </p>
    </form>
  );
}
