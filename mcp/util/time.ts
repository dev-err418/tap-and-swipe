import { z } from "zod";

export const DateRangeSchema = z
  .union([
    z.enum(["1d", "7d", "30d", "90d"]),
    z.object({ from: z.string(), to: z.string() }),
  ])
  .default("7d");

export type DateRange = z.infer<typeof DateRangeSchema>;

export interface ResolvedRange {
  start: Date;
  end: Date;
  days: number;
  previousStart: Date;
  previousEnd: Date;
  label: string;
}

export function resolveRange(input: DateRange): ResolvedRange {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + 1);

  if (typeof input === "object" && "from" in input) {
    const start = new Date(input.from);
    const explicitEnd = new Date(input.to);
    const days = Math.max(
      1,
      Math.round((explicitEnd.getTime() - start.getTime()) / 86_400_000),
    );
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - days);
    return {
      start,
      end: explicitEnd,
      days,
      previousStart,
      previousEnd: start,
      label: `${input.from}–${input.to}`,
    };
  }

  const days = parseInt(input, 10);
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  const previousStart = new Date(start);
  previousStart.setDate(previousStart.getDate() - days);
  return {
    start,
    end,
    days,
    previousStart,
    previousEnd: start,
    label: input,
  };
}

export function daysFromInput(input: DateRange): number {
  return resolveRange(input).days;
}
