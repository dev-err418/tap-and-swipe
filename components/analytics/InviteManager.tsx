"use client";

import { useState } from "react";

interface Invite {
  id: string;
  token: string;
  tier: string;
  url: string;
  used: boolean;
  usedAt: string | null;
  discordId: string | null;
  createdAt: string;
}

export default function InviteManager({ initialInvites }: { initialInvites: Invite[] }) {
  const [invites, setInvites] = useState(initialInvites);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [tier, setTier] = useState<"boilerplate" | "full">("boilerplate");

  async function generateInvite() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      if (!res.ok) throw new Error("Failed to generate invite");
      const data = await res.json();
      setInvites((prev) => [
        {
          id: data.id,
          token: data.token,
          tier: data.tier,
          url: data.url,
          used: false,
          usedAt: null,
          discordId: null,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteInvite(id: string) {
    try {
      const res = await fetch("/api/admin/invite", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to delete invite");
      setInvites((prev) => prev.filter((inv) => inv.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  function copyUrl(invite: Invite) {
    navigator.clipboard.writeText(invite.url);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div>
      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center gap-2">
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as "boilerplate" | "full")}
            className="rounded-lg bg-foreground/10 border border-foreground/10 px-3 py-1.5 text-sm text-foreground outline-none"
          >
            <option value="boilerplate">Launcher</option>
            <option value="full">Full</option>
          </select>
          <button
            onClick={generateInvite}
            disabled={loading}
            className="rounded-lg bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate invite"}
          </button>
        </div>
      </div>

      {invites.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invites yet</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-b border-foreground/10">
              <th className="text-left pb-2 font-medium">Link</th>
              <th className="text-left pb-2 font-medium">Tier</th>
              <th className="text-left pb-2 font-medium">Status</th>
              <th className="text-left pb-2 font-medium">Created</th>
              <th className="text-right pb-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {invites.map((inv) => (
              <tr key={inv.id} className="border-b border-foreground/5">
                <td className="py-2 font-mono text-xs max-w-[200px] truncate">
                  {inv.url}
                </td>
                <td className="py-2">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      inv.tier === "full"
                        ? "bg-purple-500/10 text-purple-400"
                        : "bg-primary/10 text-analytics-highlight"
                    }`}
                  >
                    {inv.tier === "boilerplate" ? "Launcher" : "Full"}
                  </span>
                </td>
                <td className="py-2">
                  {inv.used ? (
                    <span className="inline-block rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-analytics-green">
                      Used{inv.discordId ? ` (${inv.discordId})` : ""}
                    </span>
                  ) : (
                    <span className="inline-block rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      Unused
                    </span>
                  )}
                </td>
                <td className="py-2 text-muted-foreground text-xs">
                  {new Date(inv.createdAt).toLocaleDateString()}
                </td>
                <td className="py-2 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {!inv.used && (
                      <button
                        onClick={() => copyUrl(inv)}
                        className="rounded-lg bg-foreground/10 px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-foreground/20"
                      >
                        {copiedId === inv.id ? "Copied!" : "Copy"}
                      </button>
                    )}
                    <button
                      onClick={() => deleteInvite(inv.id)}
                      className="rounded-lg bg-destructive/100/10 px-3 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/100/20"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
