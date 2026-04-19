import { addDays, parse, format, differenceInCalendarDays } from "date-fns";
import { dayOfWeekInTz, isWeekday } from "./dates";

export type Cadence = "daily" | "weekdays" | "5x_week" | "weekends" | "custom";

export function isScheduledOn(cadence: string, tz: string, dateStr: string): boolean {
  const dow = dayOfWeekInTz(tz, dateStr);
  switch (cadence) {
    case "daily":
      return true;
    case "weekdays":
      return isWeekday(dow);
    case "5x_week":
      return isWeekday(dow);
    case "weekends":
      return !isWeekday(dow);
    default:
      return true;
  }
}

export function computeStreak(args: {
  cadence: string;
  tz: string;
  today: string;
  doneDates: Set<string>;
}): number {
  const { cadence, tz, today, doneDates } = args;
  let cursor = parse(today, "yyyy-MM-dd", new Date());
  let streak = 0;
  let scanned = 0;
  while (scanned < 365) {
    const cur = format(cursor, "yyyy-MM-dd");
    if (isScheduledOn(cadence, tz, cur)) {
      if (doneDates.has(cur)) {
        streak += 1;
      } else {
        if (cur === today) {
        } else {
          break;
        }
      }
    }
    cursor = addDays(cursor, -1);
    scanned += 1;
  }
  return streak;
}

export function longestStreak(args: {
  cadence: string;
  tz: string;
  dates: string[];
  doneDates: Set<string>;
}): number {
  const { cadence, tz, dates, doneDates } = args;
  let best = 0;
  let cur = 0;
  for (const d of dates) {
    if (!isScheduledOn(cadence, tz, d)) continue;
    if (doneDates.has(d)) {
      cur += 1;
      best = Math.max(best, cur);
    } else {
      cur = 0;
    }
  }
  return best;
}

export function daysAgo(fromIso: string, toIso: string): number {
  return differenceInCalendarDays(
    parse(toIso, "yyyy-MM-dd", new Date()),
    parse(fromIso, "yyyy-MM-dd", new Date()),
  );
}
