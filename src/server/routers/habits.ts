import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, onboardedProcedure } from "../trpc";
import { backlogCreateInput, backlogUpdateInput, configInput } from "../../shared/schema";
import { computeStreak } from "../../shared/streak";
import { canUnlock } from "../../shared/rule";

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

export const habitsRouter = router({
  dashboard: onboardedProcedure.query(async ({ ctx }) => {
    const [config, active, backlog, votes] = await Promise.all([
      ctx.db.config.findUnique({ where: { userId: ctx.user.id } }),
      ctx.db.identity.findMany({
        where: { userId: ctx.user.id, status: "active" },
        orderBy: { scheduledTime: "asc" },
      }),
      ctx.db.habitBacklog.findMany({
        where: { userId: ctx.user.id, status: "locked" },
        orderBy: { createdAt: "asc" },
      }),
      ctx.db.vote.findMany({
        where: {
          userId: ctx.user.id,
          done: true,
          date: {
            gte: (() => {
              const d = new Date();
              d.setDate(d.getDate() - 120);
              return d.toISOString().slice(0, 10);
            })(),
          },
        },
      }),
    ]);

    const tz = ctx.user.timezone || "UTC";
    const today = todayStr();

    const doneByIdentity = new Map<string, Set<string>>();
    for (const v of votes) {
      if (!doneByIdentity.has(v.identityId)) doneByIdentity.set(v.identityId, new Set());
      doneByIdentity.get(v.identityId)!.add(v.date);
    }

    const activeRows = active.map((id) => {
      const ddates = doneByIdentity.get(id.id) ?? new Set();
      const streak = computeStreak({ cadence: id.cadence, tz, today, doneDates: ddates });
      return {
        id: id.id,
        statement: id.statement,
        action: id.action,
        cadence: id.cadence,
        scheduledTime: id.scheduledTime,
        streak,
        cueLocation: id.cueLocation,
        stackAfter: id.stackAfter,
        mindsetReframe: id.mindsetReframe,
        immediateReward: id.immediateReward,
        groupId: id.groupId,
      };
    });

    const floor = activeRows.length ? Math.min(...activeRows.map((r) => r.streak)) : 0;
    const ruleCtx = {
      cooldownDays: config?.newHabitCooldown ?? 30,
      minimumStreak: config?.minimumStreak ?? 14,
      maxActiveHabits: config?.maxActiveHabits ?? 5,
      lastUnlockAt: config?.lastUnlockAt ?? null,
      activeCount: active.length,
      activeStreaks: activeRows.map((r) => r.streak),
      now: new Date(),
    };

    const backlogRows = backlog.map((b) => {
      const check = canUnlock(ruleCtx);
      return {
        id: b.id,
        statement: b.statement,
        action: b.action,
        cadence: b.cadence,
        scheduledTime: b.scheduledTime,
        eligible: check.ok,
        reason: check.ok ? null : check.reason,
        unlocksAt: check.ok ? null : (check.unlocksAt?.toISOString() ?? null),
      };
    });

    const monthlySlotLeft = (() => {
      if (!config?.lastUnlockAt) return config?.newHabitCooldown ?? 30;
      const ms = (config.newHabitCooldown ?? 30) * 86_400_000;
      const diff = config.lastUnlockAt.getTime() + ms - Date.now();
      return Math.max(0, Math.ceil(diff / 86_400_000));
    })();

    return {
      rule: {
        text: config?.ruleText ?? "",
        cooldownDays: config?.newHabitCooldown ?? 30,
        minimumStreak: config?.minimumStreak ?? 14,
        maxActiveHabits: config?.maxActiveHabits ?? 5,
      },
      stats: {
        floor,
        active: active.length,
        monthlySlotLeft,
      },
      active: activeRows,
      backlog: backlogRows,
    };
  }),

  addBacklog: onboardedProcedure.input(backlogCreateInput).mutation(async ({ ctx, input }) => {
    return ctx.db.habitBacklog.create({
      data: {
        userId: ctx.user.id,
        statement: input.statement,
        action: input.action,
        cadence: input.cadence,
        scheduledTime: input.scheduledTime,
      },
    });
  }),

  deleteBacklog: onboardedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const b = await ctx.db.habitBacklog.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!b) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.habitBacklog.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  updateBacklog: onboardedProcedure.input(backlogUpdateInput).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const b = await ctx.db.habitBacklog.findFirst({ where: { id, userId: ctx.user.id } });
    if (!b) throw new TRPCError({ code: "NOT_FOUND" });
    return ctx.db.habitBacklog.update({ where: { id }, data: rest });
  }),

  promoteBacklog: onboardedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const backlog = await ctx.db.habitBacklog.findFirst({
        where: { id: input.id, userId: ctx.user.id, status: "locked" },
      });
      if (!backlog) throw new TRPCError({ code: "NOT_FOUND" });

      const [config, active, votes] = await Promise.all([
        ctx.db.config.findUnique({ where: { userId: ctx.user.id } }),
        ctx.db.identity.findMany({ where: { userId: ctx.user.id, status: "active" } }),
        ctx.db.vote.findMany({
          where: {
            userId: ctx.user.id,
            done: true,
            date: {
              gte: (() => {
                const d = new Date();
                d.setDate(d.getDate() - 120);
                return d.toISOString().slice(0, 10);
              })(),
            },
          },
        }),
      ]);

      const tz = ctx.user.timezone || "UTC";
      const today = todayStr();
      const doneByIdentity = new Map<string, Set<string>>();
      for (const v of votes) {
        if (!doneByIdentity.has(v.identityId)) doneByIdentity.set(v.identityId, new Set());
        doneByIdentity.get(v.identityId)!.add(v.date);
      }
      const activeStreaks = active.map((id) =>
        computeStreak({
          cadence: id.cadence,
          tz,
          today,
          doneDates: doneByIdentity.get(id.id) ?? new Set(),
        }),
      );

      const check = canUnlock({
        cooldownDays: config?.newHabitCooldown ?? 30,
        minimumStreak: config?.minimumStreak ?? 14,
        maxActiveHabits: config?.maxActiveHabits ?? 5,
        lastUnlockAt: config?.lastUnlockAt ?? null,
        activeCount: active.length,
        activeStreaks,
        now: new Date(),
      });
      if (!check.ok) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: check.reason });
      }

      const [, , identity] = await ctx.db.$transaction([
        ctx.db.habitBacklog.update({ where: { id: backlog.id }, data: { status: "active" } }),
        ctx.db.config.update({
          where: { userId: ctx.user.id },
          data: { lastUnlockAt: new Date() },
        }),
        ctx.db.identity.create({
          data: {
            userId: ctx.user.id,
            statement: backlog.statement,
            action: backlog.action,
            cadence: backlog.cadence,
            scheduledTime: backlog.scheduledTime ?? "09:00",
            status: "active",
          },
        }),
      ]);
      await ctx.db.habitBacklog.delete({ where: { id: backlog.id } });
      return identity;
    }),

  updateConfig: onboardedProcedure.input(configInput).mutation(async ({ ctx, input }) => {
    return ctx.db.config.update({
      where: { userId: ctx.user.id },
      data: input,
    });
  }),
});
