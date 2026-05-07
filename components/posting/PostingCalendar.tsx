"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type ScheduledPostEvent = {
  id: string;
  title: string;
  publishAt: string; // ISO
  platforms: string[];
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const PLATFORM_LABEL: Record<string, string> = {
  "linkedin": "LinkedIn",
  "youtube-long": "YT Long",
  "youtube-shorts": "YT Shorts",
  "instagram-reels": "IG Reel",
};

const PLATFORM_COLOR: Record<string, string> = {
  "linkedin": "bg-sky-100 text-sky-800",
  "youtube-long": "bg-red-100 text-red-800",
  "youtube-shorts": "bg-rose-100 text-rose-800",
  "instagram-reels": "bg-fuchsia-100 text-fuchsia-800",
};

function getMonthData(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;
  return { daysInMonth: lastDay.getDate(), startDay };
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function dateKeyFromISO(iso: string) {
  const d = new Date(iso);
  return dateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function PostingCalendar({
  posts,
  onDelete,
}: {
  posts: ScheduledPostEvent[];
  onDelete?: (id: string) => Promise<void> | void;
}) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const { daysInMonth, startDay } = getMonthData(year, month);
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduledPostEvent[]>();
    for (const p of posts) {
      const k = dateKeyFromISO(p.publishAt);
      const arr = map.get(k) ?? [];
      arr.push(p);
      map.set(k, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.publishAt.localeCompare(b.publishAt));
    }
    return map;
  }, [posts]);

  function prev() {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{MONTHS[month]} {year}</h2>
        <div className="flex gap-1">
          <button onClick={prev} className="rounded-lg p-2 text-black/40 transition-colors hover:bg-black/[0.04] hover:text-black/70">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={next} className="rounded-lg p-2 text-black/40 transition-colors hover:bg-black/[0.04] hover:text-black/70">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-black/10 pb-2 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-black/40">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="border-b border-black/5 p-2 aspect-square" />;
          }
          const k = dateKey(year, month, day);
          const isToday = k === todayKey;
          const dayEvents = eventsByDate.get(k) ?? [];

          return (
            <div key={k} className="border-b border-black/5 p-2 aspect-square overflow-hidden">
              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-sm ${
                isToday ? "bg-black text-white font-semibold" : "text-black/70"
              }`}>{day}</span>
              <div className="mt-1 space-y-1">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="group rounded-md bg-black/[0.06] px-1.5 py-1 text-[10px] leading-tight"
                  >
                    <div className="truncate font-medium text-black/80">
                      {timeLabel(event.publishAt)} · {event.title}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1">
                      {event.platforms.map((p) => (
                        <span
                          key={p}
                          className={`rounded-full px-1 text-[9px] font-medium ${PLATFORM_COLOR[p] ?? "bg-black/10 text-black/60"}`}
                        >
                          {PLATFORM_LABEL[p] ?? p}
                        </span>
                      ))}
                    </div>
                    {onDelete && (
                      <button
                        onClick={() => onDelete(event.id)}
                        className="mt-0.5 text-[9px] text-red-600 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
