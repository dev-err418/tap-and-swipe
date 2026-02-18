"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, X, Loader2, Search, ArrowUpDown } from "lucide-react";

interface UserStat {
  discordId: string;
  discordUsername: string;
  totalCompleted: number;
  byCategory: Record<string, number>;
  lastActivity: string | null;
}

type SortField = "recent" | "progress";

export default function AdminStatsButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<UserStat[] | null>(null);
  const [totalVideos, setTotalVideos] = useState(0);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("recent");

  async function loadStats() {
    setOpen(true);
    setLoading(true);
    try {
      const res = await fetch("/api/roadmap/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.users);
        setTotalVideos(data.totalVideos ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!stats) return [];
    let result = stats;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.discordUsername.toLowerCase().includes(q) ||
          u.discordId.includes(q)
      );
    }

    if (sortBy === "progress") {
      result = [...result].sort(
        (a, b) => b.totalCompleted - a.totalCompleted
      );
    }

    return result;
  }, [stats, search, sortBy]);

  return (
    <>
      <button
        onClick={loadStats}
        className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-5 py-2.5 text-sm font-medium text-[#c9c4bc] hover:bg-white/10 transition-colors cursor-pointer"
      >
        <BarChart3 className="h-4 w-4" />
        Admin Stats
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-3xl border border-white/10 bg-[#2a2725] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#f1ebe2]">
                  User Progress Stats
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5 text-[#c9c4bc]" />
                </button>
              </div>

              {!loading && stats && stats.length > 0 && (
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#c9c4bc]/50" />
                    <input
                      type="text"
                      placeholder="Search by name or Discord ID..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 py-2 text-sm text-[#f1ebe2] placeholder-[#c9c4bc]/40 outline-none focus:border-[#f4cf8f]/40 transition-colors"
                    />
                  </div>
                  <button
                    onClick={() =>
                      setSortBy((s) =>
                        s === "recent" ? "progress" : "recent"
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-[#c9c4bc] hover:bg-white/10 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    {sortBy === "recent" ? "Recent" : "Progress"}
                  </button>
                </div>
              )}

              {loading && (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 text-[#f4cf8f] animate-spin" />
                </div>
              )}

              {!loading && stats && stats.length === 0 && (
                <p className="text-[#c9c4bc] text-center py-8">
                  No user progress yet.
                </p>
              )}

              {!loading && stats && stats.length > 0 && (
                <div className="space-y-4">
                  {filtered.length === 0 && (
                    <p className="text-[#c9c4bc] text-center py-8">
                      No users match your search.
                    </p>
                  )}
                  {filtered.map((user) => {
                    const pct =
                      totalVideos > 0
                        ? Math.round(
                            (user.totalCompleted / totalVideos) * 100
                          )
                        : 0;
                    return (
                      <div
                        key={user.discordId}
                        className="rounded-2xl border border-white/5 bg-white/5 p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-medium text-[#f1ebe2]">
                              {user.discordUsername}
                            </span>
                            <p className="text-xs text-[#c9c4bc]/40 font-mono">
                              {user.discordId}
                            </p>
                          </div>
                          <span className="text-sm text-[#c9c4bc]">
                            {user.totalCompleted}/{totalVideos} ({pct}%)
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {Object.entries(user.byCategory).map(
                            ([cat, count]) => (
                              <span
                                key={cat}
                                className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-[#c9c4bc]"
                              >
                                {cat}: {count as number}
                              </span>
                            )
                          )}
                        </div>
                        {user.lastActivity && (
                          <p className="text-xs text-[#c9c4bc]/50">
                            Last active:{" "}
                            {new Date(user.lastActivity).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
