import MonthCalendar, { type CalendarEvent } from "@/components/roadmap/MonthCalendar";

// Generate recurring weekly calls for Wednesdays and Sundays
// 9 PM UTC+2 = 7 PM UTC = 3 PM ET = 12 PM PT
function generateRecurringEvents(): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const start = new Date("2026-02-01"); // started in February
  const end = new Date("2027-04-01");

  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay(); // 0 = Sunday, 3 = Wednesday
    if (day === 0 || day === 3) {
      const yyyy = current.getFullYear();
      const mm = String(current.getMonth() + 1).padStart(2, "0");
      const dd = String(current.getDate()).padStart(2, "0");
      events.push({
        date: `${yyyy}-${mm}-${dd}`,
        title: "Group call",
        time: "9:00 PM CET",
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
