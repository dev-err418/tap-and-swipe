"use client";

import { useEffect } from "react";

function getSessionId() {
  const KEY = "community_session_id";
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(KEY, id);
  }
  return id;
}

function fire(type: string) {
  const sessionId = getSessionId();
  fetch("/api/community-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, sessionId }),
  }).catch(() => {});
}

export default function CommunityTracker() {
  useEffect(() => {
    fire("page_view");

    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest(
        '[data-fast-goal="cta_pricing_clicked"]'
      );
      if (target) fire("cta_clicked");
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
