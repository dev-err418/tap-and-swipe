"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";
interface Lead {
  id: string;
  firstName: string;
  email: string;
  phone: string;
  countryCode: string;
  profileType: string;
  status: string;
  answers: Record<string, number> | null;
  source: string | null;
  country: string | null;
  city: string | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  new: { label: "New", classes: "bg-foreground/10 text-muted-foreground" },
  abandoned: { label: "Abandoned", classes: "bg-destructive/100/10 text-destructive" },
  booked: { label: "Booked", classes: "bg-green-500/10 text-analytics-green" },
  whatsapp_sent: { label: "WA Sent", classes: "bg-blue-500/10 text-analytics-blue" },
  got_answered: { label: "Answered", classes: "bg-purple-500/10 text-purple-400" },
  show: { label: "Show", classes: "bg-primary/10 text-analytics-highlight" },
  no_show: { label: "No Show", classes: "bg-destructive/100/10 text-destructive" },
};

function getAnswerLabel(_questionKey: string, answerIndex: number): string {
  return `Option ${answerIndex}`;
}

export default function LeadTable({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("Delete this lead?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/quiz-lead/${id}`, { method: "DELETE" });
      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== id));
        setSelected(null);
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/quiz-lead/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
      if (selected?.id === id) setSelected((s) => s && { ...s, status });
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-foreground/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-foreground/10 bg-foreground/5">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Source</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const sc = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new;
              return (
                <tr
                  key={lead.id}
                  onClick={() => setSelected(lead)}
                  className="border-b border-foreground/5 hover:bg-foreground/5 cursor-pointer"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                    {new Date(lead.createdAt).toLocaleDateString("en-US")}{" "}
                    {new Date(lead.createdAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">{lead.firstName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {lead.countryCode} {lead.phone}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${sc.classes}`}
                    >
                      {sc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {[lead.city, lead.country].filter(Boolean).join(", ") || "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{lead.source || "\u2014"}</td>
                </tr>
              );
            })}
            {leads.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No leads yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-card border border-foreground/10 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">{selected.firstName}</h3>
              <button
                onClick={() => setSelected(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Contact info */}
            <div className="space-y-2 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span>{selected.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{selected.countryCode} {selected.phone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <select
                  value={selected.status}
                  onChange={(e) => handleStatusChange(selected.id, e.target.value)}
                  className="rounded-lg border border-foreground/10 bg-foreground/5 px-2 py-1 text-xs text-foreground outline-none focus:border-primary/50 cursor-pointer"
                >
                  {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                    <option key={value} value={value} className="bg-card">
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location</span>
                <span>{[selected.city, selected.country].filter(Boolean).join(", ") || "\u2014"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source</span>
                <span>{selected.source || "\u2014"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{new Date(selected.createdAt).toLocaleString("en-US")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lead ID (Cal.com)</span>
                <span className="font-mono text-xs">{selected.id}</span>
              </div>
            </div>

            {/* Answers */}
            <h4 className="font-bold mb-3">Quiz answers</h4>
            <div className="space-y-3 mb-6">
              {selected.answers &&
                Object.entries(selected.answers)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([key, value]) => {
                    if (key === "note") {
                      return value ? (
                        <div key={key} className="rounded-xl border border-foreground/5 bg-foreground/5 p-3">
                          <div className="text-xs text-muted-foreground mb-1">NOTE: Project description</div>
                          <div className="text-sm">{String(value)}</div>
                        </div>
                      ) : null;
                    }
                    return (
                      <div key={key} className="rounded-xl border border-foreground/5 bg-foreground/5 p-3">
                        <div className="text-xs text-muted-foreground mb-1">
                          {key.toUpperCase()}
                        </div>
                        <div className="text-sm">{getAnswerLabel(key, value)}</div>
                      </div>
                    );
                  })}
            </div>

            {/* Delete */}
            <button
              onClick={() => handleDelete(selected.id)}
              disabled={deleting}
              className="flex items-center gap-2 text-sm text-destructive hover:text-destructive cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting..." : "Delete this lead"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
