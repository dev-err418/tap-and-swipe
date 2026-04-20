"use client";

import { motion } from "framer-motion";
import { Github } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function GitHubConnectCard({
  order,
  index,
}: {
  order: number;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-6 w-6 rounded-full border-2 border-black/20 dark:border-white/20 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-black/30 dark:text-white/30 font-medium">{order}.</span>
              <h3 className="font-medium truncate text-black dark:text-white">
                Get boilerplate access
              </h3>
            </div>
            <p className="text-sm text-black/40 dark:text-white/40 mt-0.5">
              Get access to the private boilerplate repository on GitHub
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.04] p-6">
          <Dialog>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-full bg-black dark:bg-white px-5 py-2.5 text-sm font-medium text-white dark:text-black hover:bg-black/85 dark:hover:bg-white/85 transition-colors cursor-pointer">
                <Github className="h-4 w-4" />
                Get access
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Boilerplate access</DialogTitle>
                <DialogDescription>
                  To get access to the private boilerplate repository, send Arthur
                  a message on Discord with your GitHub profile link and
                  he&apos;ll invite you to the repo.
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </motion.div>
  );
}
