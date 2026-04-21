"use client";

import { useEffect } from "react";

function uuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getVisitorId(): string {
  const KEY = "visitor_id";
  const match = document.cookie.match(new RegExp(`(?:^|; )${KEY}=([^;]*)`));
  if (match) return match[1];
  const id = uuid();
  document.cookie = `${KEY}=${id}; path=/; max-age=31536000; samesite=lax`;
  return id;
}

function getSessionId(product: string): string {
  const KEY = `_sid_${product}`;
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = uuid();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

/** Read ?ref= from URL on first load, persist in sessionStorage */
function getRef(): string | undefined {
  const KEY = "_ref";
  const stored = sessionStorage.getItem(KEY);
  if (stored) return stored;
  try {
    const param = new URLSearchParams(window.location.search).get("ref");
    if (param) {
      sessionStorage.setItem(KEY, param);
      return param;
    }
  } catch {}
  return undefined;
}

function fire(
  product: string,
  type: string,
  visitorId: string,
  sessionId: string,
  extra?: { referrer?: string; ref?: string },
) {
  fetch("/api/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product,
      type,
      visitorId,
      sessionId,
      referrer: extra?.referrer || undefined,
      ref: extra?.ref || undefined,
    }),
  }).catch(() => {});
}

export default function PageTracker({
  product,
  ctaSelector,
}: {
  product: "aso" | "community" | "quiz" | "coaching";
  ctaSelector?: string;
}) {
  useEffect(() => {
    const visitorId = getVisitorId();
    const sessionId = getSessionId(product);
    const ref = getRef();

    // Get referrer
    let referrer: string | undefined;
    try {
      const host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : "";
      if (host && host !== window.location.hostname) {
        referrer = host;
      }
    } catch {}

    fire(product, "page_view", visitorId, sessionId, { referrer, ref });

    if (!ctaSelector) return;

    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest(ctaSelector!);
      if (target) fire(product, "cta_clicked", visitorId, sessionId, { ref });
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [product, ctaSelector]);

  return null;
}

export { getVisitorId, getSessionId, getRef, fire };
