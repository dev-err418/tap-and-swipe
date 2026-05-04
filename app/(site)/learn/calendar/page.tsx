import MonthCalendar, { type CalendarEvent } from "@/components/roadmap/MonthCalendar";

// Generate recurring weekly calls for Mondays, Wednesdays, and Saturdays
const WEEKLY_SLOTS: Record<number, string> = {
  1: "9:00 PM CET", // Monday
  3: "9:00 PM CET", // Wednesday
  6: "8:00 PM CET", // Saturday
};

function generateRecurringEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const start = new Date("2026-02-01"); // started in February
  const end = new Date("2027-04-01");

  const current = new Date(start);
  while (current <= end) {
    const time = WEEKLY_SLOTS[current.getDay()];
    if (time) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, "0");
      const dd = String(current.getDate()).padStart(2, "0");
      events.push({
        date: `${yyyy}-${mm}-${dd}`,
        title: "Group call",
        time,
      });
    }
    current.setDate(current.getDate() + 1);
  }

  return events;
}

const EVENTS = generateRecurringEvents();

export default function CalendarPage() {
  return (
    <>
      <div className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Calendar
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Upcoming live calls and events.
        </p>
      </div>

      <MonthCalendar events={EVENTS} />
    </>
  );
}
