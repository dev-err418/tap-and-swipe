"use client";

import { useEffect, useMemo, useState } from "react";
import { APP_ANALYTICS_TIME_ZONE, parisDatetimeLocalValue as toDatetimeLocalValue, parisDatetimeToDate } from "@/lib/app-analytics-time";
import {
  VisitorsRevenueChart,
  type AnalyticsChartNote,
  type FunnelTrendPoint,
} from "@/components/analytics/AppSprintFunnelCharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AppId = "glow" | "poky" | "versy";

export default function AppNotesChart({ appId, data }: { appId: AppId; data: FunnelTrendPoint[] }) {
  const [notes, setNotes] = useState<AnalyticsChartNote[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<AnalyticsChartNote | null>(null);
  const [editingNote, setEditingNote] = useState<AnalyticsChartNote | null>(null);
  const [notedAt, setNotedAt] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [appVersion, setAppVersion] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);

  const defaultNoteDate = useMemo(() => {
    const lastPoint = data.at(-1)?.date;
    return toDatetimeLocalValue(lastPoint ? new Date(lastPoint) : new Date());
  }, [data]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/analytics/notes?appId=${encodeURIComponent(appId)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "Could not load notes");
        setNotes(Array.isArray(payload.notes) ? payload.notes : []);
      })
      .catch((fetchError) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : "Could not load notes");
      });
    return () => controller.abort();
  }, [appId]);

  function openComposer(date?: string) {
    setEditingNote(null);
    setNotedAt(date ? toDatetimeLocalValue(new Date(date)) : defaultNoteDate);
    setTitle("");
    setContent("");
    setAppVersion("");
    setError(null);
    setComposerOpen(true);
  }

  function editNote(note: AnalyticsChartNote) {
    setEditingNote(note);
    setNotedAt(toDatetimeLocalValue(new Date(note.notedAt)));
    setTitle(note.title);
    setContent(note.content);
    setAppVersion(note.appVersion === "Unknown" ? "" : note.appVersion);
    setError(null);
    setSelectedNote(null);
    setComposerOpen(true);
  }

  async function saveNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(editingNote ? `/api/analytics/notes/${editingNote.id}` : "/api/analytics/notes", {
        method: editingNote ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          appId,
          title,
          content,
          appVersion,
          notedAt: parisDatetimeToDate(notedAt, editingNote?.notedAt).toISOString(),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not save note");
      setNotes((current) => {
        const next = editingNote
          ? current.map((note) => note.id === editingNote.id ? payload.note : note)
          : [...current, payload.note];
        return next.sort((a, b) => Date.parse(a.notedAt) - Date.parse(b.notedAt));
      });
      setComposerOpen(false);
      setEditingNote(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save note");
    } finally {
      setSaving(false);
    }
  }

  async function removeNote(note: AnalyticsChartNote) {
    setRemoving(true);
    setManageError(null);
    try {
      const response = await fetch(`/api/analytics/notes/${note.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not remove note");
      setNotes((current) => current.filter((item) => item.id !== note.id));
      setSelectedNote(null);
    } catch (removeError) {
      setManageError(removeError instanceof Error ? removeError.message : "Could not remove note");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <>
      <VisitorsRevenueChart
        data={data}
        timeZone={APP_ANALYTICS_TIME_ZONE}
        action={<span className="text-[11px] text-muted-foreground" title="Europe/Paris · daylight saving adjusts automatically">Paris time</span>}
        visitLabel="Installs"
        revenueLabel="Proceeds"
        rateLabel={appId === "glow" ? "Trial starts / installs · same time" : "Paid / installs · same time"}
        averageRateLabel="Daily average"
        rateScaleMax={appId === "versy" ? 1 : 0.3}
        averageRateScaleMax={appId === "versy" ? 1 : 0.2}
        showRateScales={appId !== "versy"}
        notes={notes}
        onAddNote={openComposer}
        onNoteClick={(note) => {
          setManageError(null);
          setSelectedNote(note);
        }}
        emptyMessage="Install and proceeds trends appear after Superwall events are tracked."
      />

      <Dialog
        open={Boolean(selectedNote)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedNote(null);
        }}
      >
        <DialogContent className="rounded-3xl border-0 bg-white sm:max-w-md">
          {selectedNote ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedNote.title}</DialogTitle>
                <DialogDescription>
                  {formatAppVersion(selectedNote.appVersion)} · {formatNoteDate(selectedNote.notedAt)}
                </DialogDescription>
              </DialogHeader>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-black/65">{selectedNote.content}</p>
              {manageError ? <p className="text-sm text-red-600">{manageError}</p> : null}
              <DialogFooter className="sm:justify-between">
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => removeNote(selectedNote)}
                  className="h-9 rounded-full px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-45"
                >
                  {removing ? "Removing…" : "Remove"}
                </button>
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => editNote(selectedNote)}
                  className="h-9 rounded-full bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-black/85 disabled:opacity-45"
                >
                  Edit
                </button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={composerOpen}
        onOpenChange={(isOpen) => {
          setComposerOpen(isOpen);
          if (!isOpen) setEditingNote(null);
        }}
      >
        <DialogContent className="rounded-3xl border-0 bg-white sm:max-w-md">
          <form onSubmit={saveNote} className="space-y-5">
            <DialogHeader>
              <DialogTitle>{editingNote ? "Edit chart note" : "Add chart note"}</DialogTitle>
              <DialogDescription>
                {editingNote
                  ? "Update the note pinned to this app's timeline."
                  : "Pin a change, launch, or experiment to this app's timeline."}
              </DialogDescription>
            </DialogHeader>

            <label className="block text-sm">
              <span className="font-medium text-black/70">Date and time (Paris)</span>
              <input
                type="datetime-local"
                required
                value={notedAt}
                onChange={(event) => setNotedAt(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm focus:border-black/30 focus:outline-none"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-black/70">Title</span>
              <input
                type="text"
                required
                maxLength={80}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="New onboarding shipped"
                className="mt-1.5 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm focus:border-black/30 focus:outline-none"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-black/70">App version</span>
              <input
                type="text"
                required
                maxLength={40}
                value={appVersion}
                onChange={(event) => setAppVersion(event.target.value)}
                placeholder="1.7.0"
                className="mt-1.5 w-full rounded-xl border border-black/10 px-3 py-2.5 text-sm focus:border-black/30 focus:outline-none"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-black/70">What changed?</span>
              <textarea
                required
                rows={4}
                maxLength={1_000}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Shipped the new onboarding, changed pricing…"
                className="mt-1.5 w-full resize-y rounded-xl border border-black/10 px-3 py-2.5 text-sm focus:border-black/30 focus:outline-none"
              />
            </label>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <DialogFooter>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="h-9 rounded-full px-4 text-sm font-medium text-black/55 transition-colors hover:bg-black/[0.04] hover:text-black"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !title.trim() || !content.trim() || !appVersion.trim() || !notedAt}
                className="h-9 rounded-full bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-black/85 disabled:opacity-45"
              >
                {saving ? "Saving…" : editingNote ? "Save changes" : "Pin note"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function formatNoteDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: APP_ANALYTICS_TIME_ZONE,
    hourCycle: "h23",
  }).format(new Date(value));
}

function formatAppVersion(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "unknown") return "Unknown version";
  return /^v/i.test(trimmed) ? trimmed : `v${trimmed}`;
}
