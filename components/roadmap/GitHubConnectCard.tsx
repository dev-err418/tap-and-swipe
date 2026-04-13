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
        className="rounded-2xl border border-black/10 bg-black/[0.02] overflow-hidden"
      >
        <div className="flex items-center gap-4 p-5 opacity-50">
          <div className="shrink-0">
            <Circle className="h-6 w-6 text-black/15" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-black/30 font-medium">{order}.</span>
              <h3 className="font-medium truncate text-black/30">
                Connect your GitHub account
              </h3>
            </div>
            <p className="text-sm text-black/20 mt-0.5">
              Link your GitHub to get access to the private boilerplate repository
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-3 py-1.5 text-xs text-black/30">
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
      className="rounded-2xl border border-black/10 bg-black/[0.02] overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-center gap-4 mb-4">
          {isConnected ? (
            <CheckCircle2 className="h-6 w-6 text-[#FF9500] shrink-0" />
          ) : (
            <div className="h-6 w-6 rounded-full border-2 border-black/20 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-black/30 font-medium">{order}.</span>
              <h3
                className={`font-medium truncate ${
                  isConnected
                    ? "text-black/40 line-through"
                    : "text-black"
                }`}
              >
                Connect your GitHub account
              </h3>
            </div>
            <p className="text-sm text-black/40 mt-0.5">
              Link your GitHub to get access to the private boilerplate
              repository
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-black/[0.03] p-6">
          {isConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Github className="h-5 w-5 text-[#FF9500]" />
                <span className="text-black font-medium">
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
                  className="inline-flex items-center gap-1.5 text-sm text-[#FF9500] hover:text-[#FF9500]/80 transition-colors"
                >
                  Accept the org invitation on GitHub
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {statusMessage && (
                <p className="text-sm text-black/50">{statusMessage}</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-black/50">
                Connect your GitHub account to get invited to the private
                boilerplate repository. You&apos;ll receive an org invitation
                automatically.
              </p>
              {statusMessage && (
                <p className="text-sm text-red-400/80">{statusMessage}</p>
              )}
              <a
                href="/api/auth/github"
                className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-black/85 transition-colors"
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
