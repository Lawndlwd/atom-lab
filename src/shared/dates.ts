import { toZonedTime } from "date-fns-tz";
import { getISOWeek, getISOWeekYear, addDays, parse } from "date-fns";

export function isoWeekInTz(tz: string, now: Date = new Date()): { year: number; week: number } {
  const zoned = toZonedTime(now, tz);
  return { year: getISOWeekYear(zoned), week: getISOWeek(zoned) };
}

export function weekDays(weekStart: string): string[] {
  const d = parse(weekStart, "yyyy-MM-dd", new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(d, i);
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, "0");
    const da = String(day.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
  });
}

export function dayOfWeekInTz(tz: string, dateStr: string): number {
  const d = parse(dateStr, "yyyy-MM-dd", new Date());
  const zoned = toZonedTime(d, tz);
  const js = zoned.getDay();
  return js === 0 ? 6 : js - 1;
}

export function isWeekday(dow: number): boolean {
  return dow >= 0 && dow <= 4;
}
