"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";

const TIME_PRESETS: { label: string; subtitle: string; hour: number; minute: number }[] = [
  { label: "US lunch", subtitle: "6 PM FR · 12 PM NY", hour: 18, minute: 0 },
  { label: "US afternoon", subtitle: "9 PM FR · 3 PM NY", hour: 21, minute: 0 },
];

const PLATFORMS: { value: string; label: string }[] = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube-long", label: "YouTube Long" },
  { value: "youtube-shorts", label: "YouTube Shorts" },
  { value: "instagram-reels", label: "Instagram Reels" },
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function buildLocalDatetimeValue(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export default function SchedulePostForm({
  onSubmitted,
}: {
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishAt, setPublishAt] = useState("");

  function applyPreset(hour: number, minute: number) {
    const base = publishAt ? new Date(publishAt) : new Date();
    base.setHours(hour, minute, 0, 0);
    if (base.getTime() < Date.now()) {
      base.setDate(base.getDate() + 1);
    }
    setPublishAt(buildLocalDatetimeValue(base));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const formEl = e.currentTarget;
    const data = new FormData(formEl);
    try {
      const platforms = data.getAll("platforms").map(String);
      const payload = {
        title: String(data.get("title") ?? ""),
        description: String(data.get("description") ?? ""),
        publishAt: String(data.get("publishAt") ?? ""),
        platforms,
      };
      const res = await fetch("/api/posting", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Save failed (${res.status})`);
      }
      formEl.reset();
      setPublishAt("");
      if (onSubmitted) onSubmitted();
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-black/70">Title</span>
          <input
            name="title"
            required
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm focus:border-black/30 focus:outline-none"
            maxLength={100}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-black/70">Publish at</span>
          <input
            name="publishAt"
            type="datetime-local"
            required
            value={publishAt}
            onChange={(e) => setPublishAt(e.target.value)}
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm focus:border-black/30 focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-3">
        <span className="block text-xs font-medium text-black/50">Quick times</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {TIME_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p.hour, p.minute)}
              className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-xs transition-colors hover:bg-black/[0.04]"
              title={p.subtitle}
            >
              <span className="font-medium text-black/80">{p.label}</span>
              <span className="ml-1 text-black/40">· {p.subtitle}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="mt-4 block text-sm">
        <span className="font-medium text-black/70">Notes</span>
        <textarea
          name="description"
          rows={3}
          placeholder="Hook, angle, references…"
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm focus:border-black/30 focus:outline-none"
        />
      </label>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-black/70">Platforms</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {PLATFORMS.map((p) => (
            <label key={p.value} className="inline-flex items-center gap-2 text-sm">
              <Checkbox name="platforms" value={p.value} />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/85 disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
