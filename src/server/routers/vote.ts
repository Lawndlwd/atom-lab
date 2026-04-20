import { TRPCError } from "@trpc/server";
import { router, onboardedProcedure } from "../trpc";
import { voteListInput, voteToggleInput, voteWeekInput } from "../../shared/schema";
import { computeStreak, isScheduledOn, longestStreak } from "../../shared/streak";
import { weekDays } from "../../shared/dates";

export const voteRouter = router({
  list: onboardedProcedure.input(voteListInput).query(async ({ ctx, input }) => {
    const tz = ctx.user.timezone || "UTC";
    const identities = await ctx.db.identity.findMany({
      where: { userId: ctx.user.id, status: "active" },
      orderBy: { scheduledTime: "asc" },
    });

    const since = new Date();
    since.setDate(since.getDate() - 120);
    const votes = await ctx.db.vote.findMany({
      where: { userId: ctx.user.id, date: { gte: formatDate(since) } },
    });

    const byIdentity = new Map<string, Set<string>>();
    for (const v of votes) {
      if (!v.done) continue;
      if (!byIdentity.has(v.identityId)) byIdentity.set(v.identityId, new Set());
      byIdentity.get(v.identityId)!.add(v.date);
    }

    const rows = identities.map((id) => {
      const doneDates = byIdentity.get(id.id) ?? new Set<string>();
      const voteToday = votes.find((v) => v.identityId === id.id && v.date === input.date);
      const streak = computeStreak({ cadence: id.cadence, tz, today: input.date, doneDates });
      return {
        id: id.id,
        statement: id.statement,
        action: id.action,
        scheduledTime: id.scheduledTime,
        cadence: id.cadence,
        done: voteToday?.done ?? false,
        partial: voteToday?.partial ?? false,
        streak,
        mindsetReframe: id.mindsetReframe,
        immediateReward: id.immediateReward,
        stackAfter: id.stackAfter,
        cueLocation: id.cueLocation,
        groupId: id.groupId,
      };
    });

    return { date: input.date, rows };
  }),

  toggle: onboardedProcedure.input(voteToggleInput).mutation(async ({ ctx, input }) => {
    const identity = await ctx.db.identity.findFirst({
      where: { id: input.identityId, userId: ctx.user.id },
    });
    if (!identity) throw new TRPCError({ code: "NOT_FOUND" });

    const existing = await ctx.db.vote.findUnique({
      where: { identityId_date: { identityId: input.identityId, date: input.date } },
    });
    const isPartial = input.partial ?? false;
    // Partial counts as a vote (streak preserved) but is flagged for Week view.
    const targetDone = isPartial ? true : (input.done ?? !(existing?.done ?? false));
    const targetPartial = isPartial ? true : (existing?.partial ?? false) && targetDone;

    const vote = await ctx.db.vote.upsert({
      where: { identityId_date: { identityId: input.identityId, date: input.date } },
      create: {
        identityId: input.identityId,
        userId: ctx.user.id,
        date: input.date,
        done: targetDone,
        partial: targetPartial,
      },
      update: { done: targetDone, partial: targetPartial },
    });

    const since = new Date();
    since.setDate(since.getDate() - 120);
    const votes = await ctx.db.vote.findMany({
      where: {
        userId: ctx.user.id,
        identityId: input.identityId,
        date: { gte: formatDate(since) },
      },
    });
    const doneDates = new Set(votes.filter((v) => v.done).map((v) => v.date));
    const streak = computeStreak({
      cadence: identity.cadence,
      tz: ctx.user.timezone || "UTC",
      today: input.date,
      doneDates,
    });

    return { vote, streak };
  }),

  week: onboardedProcedure.input(voteWeekInput).query(async ({ ctx, input }) => {
    const tz = ctx.user.timezone || "UTC";
    const days = weekDays(input.weekStart);
    const today = formatDate(new Date());

    const identities = await ctx.db.identity.findMany({
      where: { userId: ctx.user.id, status: "active" },
      orderBy: { scheduledTime: "asc" },
    });

    const since = new Date();
    since.setDate(since.getDate() - 365);
    const votes = await ctx.db.vote.findMany({
      where: { userId: ctx.user.id, date: { gte: formatDate(since) } },
    });

    const byIdentity = new Map<string, Set<string>>();
    const partialByIdentity = new Map<string, Set<string>>();
    for (const v of votes) {
      if (!v.done) continue;
      if (!byIdentity.has(v.identityId)) byIdentity.set(v.identityId, new Set());
      byIdentity.get(v.identityId)!.add(v.date);
      if (v.partial) {
        if (!partialByIdentity.has(v.identityId)) partialByIdentity.set(v.identityId, new Set());
        partialByIdentity.get(v.identityId)!.add(v.date);
      }
    }

    let totalVotes = 0;
    let totalScheduled = 0;
    let globalLongest = 0;
    let missedTwice = false;

    const rows = identities.map((id) => {
      const doneDates = byIdentity.get(id.id) ?? new Set<string>();
      const partialDates = partialByIdentity.get(id.id) ?? new Set<string>();
      const slabs = days.map((d) => {
        const scheduled = isScheduledOn(id.cadence, tz, d);
        const done = doneDates.has(d);
        const partial = partialDates.has(d);
        if (!scheduled) return { date: d, state: "na" as const, isToday: d === today, partial };
        if (done) {
          totalVotes += 1;
          totalScheduled += 1;
          return {
            date: d,
            state: partial ? ("partial" as const) : ("done" as const),
            isToday: d === today,
            partial,
          };
        }
        totalScheduled += 1;
        if (d < today) return { date: d, state: "miss" as const, isToday: false, partial: false };
        return { date: d, state: "pending" as const, isToday: d === today, partial: false };
      });

      const missesThisWeek = slabs.filter((s) => s.state === "miss").length;
      if (missesThisWeek >= 2) missedTwice = true;

      const streak = computeStreak({ cadence: id.cadence, tz, today, doneDates });
      const longest = longestStreak({ cadence: id.cadence, tz, dates: days, doneDates });
      globalLongest = Math.max(globalLongest, longest);

      return {
        id: id.id,
        statement: id.statement,
        action: id.action,
        cadence: id.cadence,
        streak,
        longest,
        slabs,
      };
    });

    return {
      weekStart: input.weekStart,
      days,
      today,
      rows,
      stats: { totalVotes, totalScheduled, globalLongest, missedTwice },
    };
  }),
});

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}
