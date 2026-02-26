"use client";

import { motion } from "framer-motion";
import { Github, CheckCircle2, ExternalLink, Lock, Circle } from "lucide-react";

export default function GitHubConnectCard({
  order,
  index,
  githubUsername,
  githubStatus,
  isLocked,
}: {
  order: number;
  index: number;
  githubUsername: string | null;
  githubStatus: string | null;
  isLocked?: boolean;
}) {
  const isConnected = !!githubUsername;

  if (isLocked) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
        className="rounded-2xl border border-white/5 bg-white/5 overflow-hidden"
      >
        <div className="flex items-center gap-4 p-5 opacity-50">
          <div className="shrink-0">
            <Circle className="h-6 w-6 text-[#c9c4bc]/20" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[#c9c4bc]/60 font-medium">{order}.</span>
              <h3 className="font-medium truncate text-[#c9c4bc]/60">
                Connect your GitHub account
              </h3>
            </div>
            <p className="text-sm text-[#c9c4bc]/40 mt-0.5">
              Link your GitHub to get access to the private boilerplate repository
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs text-[#c9c4bc]/40">
            <Lock className="h-3 w-3" />
            Premium
          </span>
        </div>
      </motion.div>
    );
  }

  const statusMessage =
    githubStatus === "already_member"
      ? "You already have access to the repository."
      : githubStatus === "error"
        ? "Something went wrong with the invite. You can try again or ask for help in Discord."
        : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="rounded-2xl border border-white/5 bg-white/5 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-center gap-4 mb-4">
          {isConnected ? (
            <CheckCircle2 className="h-6 w-6 text-[#f4cf8f] shrink-0" />
          ) : (
            <div className="h-6 w-6 rounded-full border-2 border-[#c9c4bc]/40 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[#c9c4bc]/60 font-medium">{order}.</span>
              <h3
                className={`font-medium truncate ${
                  isConnected
                    ? "text-[#c9c4bc] line-through"
                    : "text-[#f1ebe2]"
                }`}
              >
                Connect your GitHub account
              </h3>
            </div>
            <p className="text-sm text-[#c9c4bc]/60 mt-0.5">
              Link your GitHub to get access to the private boilerplate
              repository
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-black/10 p-6">
          {isConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Github className="h-5 w-5 text-[#f4cf8f]" />
                <span className="text-[#f1ebe2] font-medium">
                  Connected as @{githubUsername}
                </span>
                {process.env.NODE_ENV === "development" && (
                  <button
                    onClick={async () => {
                      await fetch("/api/auth/github/disconnect", { method: "POST" });
                      window.location.reload();
                    }}
                    className="text-xs text-red-400/60 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    (disconnect)
                  </button>
                )}
              </div>
              {githubStatus === "invited" && (
                <a
                  href="https://github.com/settings/organizations"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-[#f4cf8f] hover:text-[#f4cf8f]/80 transition-colors"
                >
                  Accept the org invitation on GitHub
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {statusMessage && (
                <p className="text-sm text-[#c9c4bc]/80">{statusMessage}</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[#c9c4bc]">
                Connect your GitHub account to get invited to the private
                boilerplate repository. You&apos;ll receive an org invitation
                automatically.
              </p>
              {statusMessage && (
                <p className="text-sm text-red-400/80">{statusMessage}</p>
              )}
              <a
                href="/api/auth/github"
                className="inline-flex items-center gap-2 rounded-full bg-[#f1ebe2] px-5 py-2.5 text-sm font-medium text-[#2a2725] hover:bg-[#f1ebe2]/90 transition-colors"
              >
                <Github className="h-4 w-4" />
                Connect with GitHub
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
