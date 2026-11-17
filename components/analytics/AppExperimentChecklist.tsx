"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Check, Pencil, X } from "lucide-react";
import type { AnalyticsAppId } from "@/lib/analytics-access";

type Item = { id: string; text: string; completed: boolean };

export default function AppExperimentChecklist({ appId }: { appId: AnalyticsAppId }) {
  const [items, setItems] = useState<Item[]>([]);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [saved, setSaved] = useState(false);
  const endpoint = `/api/analytics/experiments?appId=${appId}`;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(endpoint, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load notes.");
        const data = await response.json();
        setItems(data.items);
      })
      .catch(() => { if (!controller.signal.aborted) setError("Could not load notes. Please retry."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint, reload]);

  async function mutate(method: string, input: object) {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch(endpoint, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error("Could not save your changes. Please try again.");
      const data = await response.json();
      if (method === "POST") { setItems((current) => [...current, data.item]); setDraft(""); }
      if (method === "PATCH") { setItems((current) => current.map((item) => item.id === data.item.id ? data.item : item)); setEditing(null); }
      if (method === "DELETE") setItems((current) => current.filter((item) => item.id !== data.id));
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save your changes.");
    } finally { setBusy(false); }
  }

  const button = "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-ring";
  return <section aria-label="On our radar" className="rounded-[28px] bg-card p-4 sm:p-6">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold">On our radar</h2>
      <span role="status" className="text-xs text-muted-foreground">{busy ? "Saving…" : saved ? "Saved" : items.length ? `${items.filter((item) => !item.completed).length} to do` : ""}</span>
    </div>
    {loading ? <p className="text-sm text-muted-foreground">Loading notes…</p> : <>
      <ul className="space-y-1">
        {items.map((item) => <li key={item.id} className="flex items-start gap-2 py-1">
          <input type="checkbox" checked={item.completed} disabled={busy} aria-label={`Mark ${item.text} ${item.completed ? "incomplete" : "complete"}`} onChange={() => void mutate("PATCH", { id: item.id, completed: !item.completed })} className="mt-2 size-4 shrink-0 accent-current" />
          {editing === item.id ? <form className="flex min-w-0 flex-1 gap-1" onSubmit={(event) => { event.preventDefault(); if (editText.trim()) void mutate("PATCH", { id: item.id, text: editText.trim() }); }}>
            <input autoFocus aria-label="Edit note" value={editText} onChange={(event) => setEditText(event.target.value)} maxLength={1000} disabled={busy} className="min-w-0 flex-1 rounded-lg bg-foreground/5 px-2 text-sm" />
            <button aria-label="Save note" className={button} disabled={busy || !editText.trim()}><Check className="size-4" /></button>
            <button type="button" aria-label="Cancel editing" className={button} disabled={busy} onClick={() => setEditing(null)}><X className="size-4" /></button>
          </form> : <>
            <span className={`min-w-0 flex-1 break-words py-1.5 text-sm ${item.completed ? "text-muted-foreground line-through" : ""}`}>{item.text}</span>
            <button aria-label={`Edit ${item.text}`} className={button} disabled={busy} onClick={() => { setEditing(item.id); setEditText(item.text); }}><Pencil className="size-3.5" /></button>
            <button aria-label={`Delete ${item.text}`} className={button} disabled={busy} onClick={() => void mutate("DELETE", { id: item.id })}><Trash2 className="size-3.5" /></button>
          </>}
        </li>)}
      </ul>
      <form className="mt-2 flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); if (draft.trim()) void mutate("POST", { text: draft.trim() }); }}>
        <input aria-label="New note" placeholder="Something to watch, try, or test…" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} disabled={busy} className="h-10 min-w-0 flex-1 rounded-xl bg-foreground/[0.045] px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40" />
        <button aria-label="Add note" disabled={busy || !draft.trim()} className={button}><Plus className="size-4" /></button>
      </form>
    </>}
    {error && <div role="alert" className="mt-3 text-sm text-destructive">{error} <button className="underline" disabled={busy} onClick={() => setReload((value) => value + 1)}>Reload</button></div>}
  </section>;
}
