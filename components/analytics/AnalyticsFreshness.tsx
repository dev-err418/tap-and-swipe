"use client";

import { useEffect, useState } from "react";

export default function AnalyticsFreshness({ updatedAt, label = "Data" }: { updatedAt?: string; label?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, []);
  if (!updatedAt) return null;
  const minutes = now === null ? null : Math.max(0, Math.floor((now - Date.parse(updatedAt)) / 60_000));
  const age = minutes === null ? "" : minutes < 1 ? "just now" : minutes < 60 ? `${minutes} min ago`
    : minutes < 1_440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1_440)}d ago`;
  return <p className="text-xs text-muted-foreground">
    {label} updated <time dateTime={updatedAt} title={updatedAt}>{age || "at the last refresh"}</time>
    {minutes !== null && minutes > 60 ? " · Showing saved results; refresh delayed" : " · Refreshes every 30 min"}
  </p>;
}
