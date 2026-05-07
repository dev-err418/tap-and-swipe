"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import PostingCalendar, { type ScheduledPostEvent } from "./PostingCalendar";
import SchedulePostForm from "./SchedulePostForm";

export default function PostingClient({
  posts,
}: {
  posts: ScheduledPostEvent[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleDelete(id: string) {
    if (!confirm("Delete this scheduled post?")) return;
    const res = await fetch(`/api/posting/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error ?? `Delete failed (${res.status})`);
      return;
    }
    router.refresh();
  }

  function handleSubmitted() {
    setOpen(false);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button
              className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-black/85"
              aria-label="Schedule a new post"
            >
              <Plus className="h-4 w-4" />
              New post
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Plan a post</DialogTitle>
              <DialogDescription>
                Block out a slot in your content calendar. Posting still happens manually on each platform.
              </DialogDescription>
            </DialogHeader>
            <SchedulePostForm onSubmitted={handleSubmitted} />
          </DialogContent>
        </Dialog>
      </div>

      <PostingCalendar posts={posts} onDelete={handleDelete} />
    </div>
  );
}
