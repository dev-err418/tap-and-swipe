"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

export default function NoteScreen({
  initialValue,
  onSubmit,
}: {
  initialValue: string;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState(initialValue);

  return (
    <div className="flex flex-col items-center text-center max-w-lg mx-auto w-full">
      <h2 className="font-serif text-3xl font-bold tracking-tight leading-tight sm:text-4xl mb-3">
        Describe your project in 1-2 sentences
      </h2>

      <p className="text-[#c9c4bc] mb-8 text-base sm:text-lg">
        This helps me give you a more relevant recommendation.
      </p>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. I want to build a booking app for my salon chain..."
        rows={4}
        autoFocus
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[#f1ebe2] placeholder:text-[#c9c4bc]/40 outline-none focus:border-[#f4cf8f]/50 focus:ring-1 focus:ring-[#f4cf8f]/20 resize-none mb-6"
      />

      <button
        onClick={() => onSubmit(note.trim())}
        data-fast-goal="quiz_note_submit"
        className="group flex h-12 items-center gap-2 rounded-full bg-[#f4cf8f] px-8 text-base font-bold text-[#2a2725] transition-all hover:bg-[#f4cf8f]/90 hover:ring-4 hover:ring-[#f4cf8f]/20 cursor-pointer"
      >
        Continue
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </button>
    </div>
  );
}
