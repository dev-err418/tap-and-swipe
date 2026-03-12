"use client";

import { useEffect } from "react";

function getVisitorId(): string {
  const KEY = "visitor_id";
  const match = document.cookie.match(new RegExp(`(?:^|; )${KEY}=([^;]*)`));
  if (match) return match[1];
  const id = crypto.randomUUID();
  document.cookie = `${KEY}=${id}; path=/; max-age=31536000; samesite=lax`;
  return id;
}

function getSessionId(product: string): string {
  const KEY = `_sid_${product}`;
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

function fire(product: string, type: string, visitorId: string, sessionId: string, referrer?: string) {
  fetch("/api/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product, type, visitorId, sessionId, referrer: referrer || undefined }),
  }).catch(() => {});
}

export default function PageTracker({
  product,
  ctaSelector,
}: {
  product: "aso" | "community";
  ctaSelector?: string;
}) {
  useEffect(() => {
    const visitorId = getVisitorId();
    const sessionId = getSessionId(product);

    // Get referrer
    let referrer: string | undefined;
    try {
      const host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : "";
      if (host && host !== window.location.hostname) {
        referrer = host;
      }
    } catch {}

    fire(product, "page_view", visitorId, sessionId, referrer);

    if (!ctaSelector) return;

    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest(ctaSelector!);
      if (target) fire(product, "cta_clicked", visitorId, sessionId);
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [product, ctaSelector]);

  return null;
}

export { getVisitorId, getSessionId };
