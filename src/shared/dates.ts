import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { getISOWeek, getISOWeekYear, startOfISOWeek, addDays, parse } from "date-fns";

export function todayInTz(tz: string, now: Date = new Date()): string {
  return formatInTimeZone(now, tz, "yyyy-MM-dd");
}

export function isoWeekInTz(tz: string, now: Date = new Date()): { year: number; week: number } {
  const zoned = toZonedTime(now, tz);
  return { year: getISOWeekYear(zoned), week: getISOWeek(zoned) };
}

export function weekStartDateInTz(tz: string, now: Date = new Date()): string {
  const zoned = toZonedTime(now, tz);
  const monday = startOfISOWeek(zoned);
  return formatInTimeZone(monday, tz, "yyyy-MM-dd");
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

export function parseHHMM(s: string): { h: number; m: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

export function formatHHMM(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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

export function humanDate(tz: string, dateStr: string): string {
  const d = parse(dateStr, "yyyy-MM-dd", new Date());
  return formatInTimeZone(d, tz, "EEE · MMM d");
}
