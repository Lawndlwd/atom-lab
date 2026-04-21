import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, onboardedProcedure } from "../trpc";
import {
  badHabitCreateInput,
  badHabitUpdateInput,
  badHabitLogInput,
  badHabitListByDateInput,
  badHabitWeekInput,
} from "../../shared/schema";
import { weekDays } from "../../shared/dates";

export const badHabitsRouter = router({
  list: onboardedProcedure
    .input(z.object({ status: z.enum(["active", "archived"]).optional() }).optional())
    .query(({ ctx, input }) =>
      ctx.db.badHabit.findMany({
        where: { userId: ctx.user.id, status: input?.status ?? "active" },
        orderBy: { createdAt: "asc" },
      }),
    ),

  listByDate: onboardedProcedure.input(badHabitListByDateInput).query(async ({ ctx, input }) => {
    const bh = await ctx.db.badHabit.findMany({
      where: { userId: ctx.user.id, status: "active" },
      orderBy: { createdAt: "asc" },
    });
    const logs = await ctx.db.badHabitLog.findMany({
      where: { userId: ctx.user.id, date: input.date },
    });
    const byId = new Map(logs.map((l) => [l.badHabitId, l]));
    return bh.map((h) => ({
      id: h.id,
      name: h.name,
      description: h.description,
      invisibleAction: h.invisibleAction,
      unattractiveReframe: h.unattractiveReframe,
      difficultAction: h.difficultAction,
      unsatisfyingConsequence: h.unsatisfyingConsequence,
      weakened: byId.get(h.id)?.weakened ?? false,
    }));
  }),

  create: onboardedProcedure.input(badHabitCreateInput).mutation(async ({ ctx, input }) => {
    return ctx.db.badHabit.create({
      data: { ...input, userId: ctx.user.id },
    });
  }),

  update: onboardedProcedure.input(badHabitUpdateInput).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const existing = await ctx.db.badHabit.findFirst({ where: { id, userId: ctx.user.id } });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    return ctx.db.badHabit.update({ where: { id }, data: rest });
  }),

  archive: onboardedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.badHabit.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.badHabit.update({
        where: { id: input.id },
        data: { status: "archived", archivedAt: new Date() },
      });
    }),

  unarchive: onboardedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.badHabit.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.badHabit.update({
        where: { id: input.id },
        data: { status: "active", archivedAt: null },
      });
    }),

  delete: onboardedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.badHabit.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.badHabit.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  toggleLog: onboardedProcedure.input(badHabitLogInput).mutation(async ({ ctx, input }) => {
    const bh = await ctx.db.badHabit.findFirst({
      where: { id: input.badHabitId, userId: ctx.user.id },
    });
    if (!bh) throw new TRPCError({ code: "NOT_FOUND" });

    const existing = await ctx.db.badHabitLog.findUnique({
      where: { badHabitId_date: { badHabitId: input.badHabitId, date: input.date } },
    });
    const target = input.weakened ?? !(existing?.weakened ?? false);

    return ctx.db.badHabitLog.upsert({
      where: { badHabitId_date: { badHabitId: input.badHabitId, date: input.date } },
      create: {
        userId: ctx.user.id,
        badHabitId: input.badHabitId,
        date: input.date,
        weakened: target,
        note: input.note,
      },
      update: { weakened: target, note: input.note ?? existing?.note ?? null },
    });
  }),

  week: onboardedProcedure.input(badHabitWeekInput).query(async ({ ctx, input }) => {
    const days = weekDays(input.weekStart);
    const bh = await ctx.db.badHabit.findMany({
      where: { userId: ctx.user.id, status: "active" },
      orderBy: { createdAt: "asc" },
    });
    const logs = await ctx.db.badHabitLog.findMany({
      where: { userId: ctx.user.id, date: { in: days } },
    });
    const byHabitDate = new Map<string, boolean>();
    for (const l of logs) byHabitDate.set(l.badHabitId + "|" + l.date, l.weakened);

    const rows = bh.map((h) => ({
      id: h.id,
      name: h.name,
      slabs: days.map((d) => ({
        date: d,
        weakened: byHabitDate.get(h.id + "|" + d) ?? false,
      })),
    }));

    const totalWeakened = rows.reduce((n, r) => n + r.slabs.filter((s) => s.weakened).length, 0);
    const totalOpportunities = rows.length * days.length;

    return { days, rows, stats: { totalWeakened, totalOpportunities } };
  }),
});
