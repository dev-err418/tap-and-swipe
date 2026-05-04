"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";

export default function SchedulePostForm({
  ytConnected,
  onSubmitted,
}: {
  ytConnected: boolean;
  onSubmitted?: () => void;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const formEl = e.currentTarget;
    const data = new FormData(formEl);
    try {
      const res = await fetch("/api/posting", { method: "POST", body: data });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Upload failed (${res.status})`);
      }
      formEl.reset();
      if (onSubmitted) onSubmitted();
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ytConnected) {
    return (
      <div className="py-2">
        <p className="text-sm text-black/60">
          Connect a YouTube channel first.
        </p>
        <a
          href="/api/auth/youtube"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/85"
        >
          Connect YouTube
        </a>
      </div>
    );
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
            className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm focus:border-black/30 focus:outline-none"
          />
        </label>
      </div>

      <label className="mt-4 block text-sm">
        <span className="font-medium text-black/70">Description</span>
        <textarea
          name="description"
          rows={3}
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm focus:border-black/30 focus:outline-none"
        />
      </label>

      <label className="mt-4 block text-sm">
        <span className="font-medium text-black/70">Tags (comma separated)</span>
        <input
          name="tags"
          placeholder="appsprint, swiftui, ios"
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm focus:border-black/30 focus:outline-none"
        />
      </label>

      <label className="mt-4 block text-sm">
        <span className="font-medium text-black/70">Video file</span>
        <input
          name="video"
          type="file"
          accept="video/mp4,video/quicktime,video/*"
          required
          className="mt-1 w-full rounded-md border border-black/10 px-3 py-2 text-sm"
        />
        <span className="mt-1 block text-xs text-black/40">
          MP4 or MOV. Vertical 9:16 for Shorts. Uploads stream to YouTube directly.
        </span>
      </label>

      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-black/70">Platforms</legend>
        <div className="mt-2 flex items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <Checkbox name="platforms" value="youtube" defaultChecked />
            YouTube
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-black/40">
            <Checkbox name="platforms" value="instagram" disabled />
            Instagram <span className="text-xs">(coming soon)</span>
          </label>
        </div>
      </fieldset>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black/85 disabled:opacity-50"
      >
        {submitting ? "Uploading…" : "Schedule"}
      </button>
    </form>
  );
}
