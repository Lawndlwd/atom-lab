import { useMemo } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { getISOWeek } from "date-fns";
import { useAuth } from "../providers/auth";

export function useTodayDate() {
  const { user } = useAuth();
  const tz = user?.timezone || "UTC";
  return useMemo(() => {
    const now = new Date();
    const dateStr = formatInTimeZone(now, tz, "yyyy-MM-dd");
    const pretty = formatInTimeZone(now, tz, "EEE · MMM d");
    const prettyLong = formatInTimeZone(now, tz, "EEEE · MMMM d");
    const week = getISOWeek(now);
    return { tz, date: dateStr, pretty, prettyLong, week };
  }, [tz]);
}

export function formatScheduledTime(hhmm: string, tz: string, style: "short" | "long" = "short") {
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return formatInTimeZone(d, tz, style === "short" ? "h:mm" : "h:mm a");
}
