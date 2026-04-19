import cron from "node-cron";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "../db";
import { sendPush, vapidConfigured } from "./webpush";
import { isScheduledOn } from "../../shared/streak";

export function startPushScheduler() {
  if (!vapidConfigured) {
    console.log("[push] VAPID not configured — scheduler disabled");
    return;
  }
  cron.schedule("* * * * *", async () => {
    try {
      await runTick(new Date());
    } catch (e) {
      console.error("[push] tick error", e);
    }
  });
  console.log("[push] scheduler running (every minute)");
}

export async function runTick(now: Date) {
  const users = await db.user.findMany({
    where: { onboardedAt: { not: null } },
  });

  for (const user of users) {
    const tz = user.timezone || "UTC";
    const localHHMM = formatInTimeZone(now, tz, "HH:mm");
    const localDate = formatInTimeZone(now, tz, "yyyy-MM-dd");

    const ids = await db.identity.findMany({
      where: { userId: user.id, status: "active", scheduledTime: localHHMM },
    });
    if (ids.length === 0) continue;

    const subs = await db.pushSubscription.findMany({ where: { userId: user.id } });
    if (subs.length === 0) continue;

    for (const id of ids) {
      if (!isScheduledOn(id.cadence, tz, localDate)) continue;

      const existingLog = await db.pushLog.findUnique({
        where: {
          userId_identityId_date: { userId: user.id, identityId: id.id, date: localDate },
        },
      });
      if (existingLog) continue;

      for (const sub of subs) {
        try {
          await sendPush(sub, {
            title: id.statement,
            body: id.action,
            tag: id.id,
            data: { identityId: id.id, date: localDate },
            actions: [
              { action: "done", title: "Mark done" },
              { action: "snooze", title: "Snooze 15m" },
            ],
          });
        } catch (e: unknown) {
          const err = e as { statusCode?: number };
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          } else {
            console.error("[push] send failed", err);
          }
        }
      }

      await db.pushLog.create({
        data: { userId: user.id, identityId: id.id, date: localDate },
      });
    }
  }
}
