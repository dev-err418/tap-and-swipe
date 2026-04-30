"use client";

import { useEffect, useState } from "react";

type Contact = { id: string; email: string; subscribed: boolean };
type Status = "idle" | "loading" | "ready" | "submitting" | "missing" | "error";

export function UnsubscribeCard({ contactId }: { contactId: string | null }) {
  const [status, setStatus] = useState<Status>(contactId ? "loading" : "missing");
  const [contact, setContact] = useState<Contact | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!contactId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/newsletter/preference?id=${encodeURIComponent(contactId)}`);
        if (!res.ok) throw new Error("Couldn't load your subscription. The link may have expired.");
        const data = (await res.json()) as Contact;
        if (cancelled) return;
        setContact(data);
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  async function setSubscription(subscribed: boolean) {
    if (!contact) return;
    setStatus("submitting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/newsletter/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: contact.id, subscribed }),
      });
      if (!res.ok) throw new Error("Something went wrong. Please try again.");
      const data = (await res.json()) as Contact;
      setContact(data);
      setStatus("ready");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "missing") {
    return (
      <CardShell>
        <p className="text-center text-sm text-black/60">
          This link is missing a contact reference. Please use the link from your email.
        </p>
      </CardShell>
    );
  }

  if (status === "loading") {
    return (
      <CardShell>
        <p className="text-center text-sm text-black/60">Loading your subscription…</p>
      </CardShell>
    );
  }

  if (status === "error" && !contact) {
    return (
      <CardShell>
        <p className="text-center text-sm text-red-600">{errorMsg}</p>
      </CardShell>
    );
  }

  if (!contact) return null;

  return (
    <CardShell>
      <h1 className="mb-6 text-center text-3xl font-semibold tracking-tight sm:text-4xl">
        Manage your subscription
      </h1>

      <div className="mb-8 text-center text-base font-medium text-black/70">
        We're sorry to see you go. Are you sure you want to unsubscribe{" "}
        {contact.email} from receiving emails?
      </div>

      {contact.subscribed ? (
        <button
          type="button"
          onClick={() => setSubscription(false)}
          disabled={status === "submitting"}
          className="w-full cursor-pointer rounded-full bg-black px-6 py-3 text-sm font-bold text-white transition-all hover:bg-black/85 disabled:opacity-50"
        >
          {status === "submitting" ? "Unsubscribing…" : "Unsubscribe from Tap & Swipe"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setSubscription(true)}
          disabled={status === "submitting"}
          className="w-full cursor-pointer rounded-full border border-black/15 bg-white px-6 py-3 text-sm font-bold text-black transition-all hover:bg-black/5 disabled:opacity-50"
        >
          {status === "submitting" ? "Resubscribing…" : "Resubscribe"}
        </button>
      )}

      {errorMsg && status === "error" && (
        <p className="mt-4 text-center text-xs text-red-600">{errorMsg}</p>
      )}

      <p className="mt-6 text-center text-xs text-black/50">
        Changed your mind? You can flip this anytime.
      </p>
    </CardShell>
  );
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full rounded-2xl border border-black/10 bg-white p-8 shadow-sm">
      {children}
    </div>
  );
}
