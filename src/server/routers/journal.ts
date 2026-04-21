import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, onboardedProcedure } from "../trpc";
import {
  journalByDateInput,
  journalCreateEntryInput,
  journalRangeInput,
  journalTypeInput,
  journalTypeUpdateInput,
  journalUpdateEntryInput,
} from "../../shared/schema";

export const journalRouter = router({
  listTypes: onboardedProcedure.query(({ ctx }) =>
    ctx.db.journalType.findMany({
      where: { userId: ctx.user.id },
      orderBy: { order: "asc" },
    }),
  ),

  createType: onboardedProcedure.input(journalTypeInput).mutation(async ({ ctx, input }) => {
    return ctx.db.journalType.create({
      data: {
        userId: ctx.user.id,
        slug: input.slug,
        label: input.label,
        color: input.color ?? "#7cb5a5",
        order: input.order ?? 0,
      },
    });
  }),

  updateType: onboardedProcedure.input(journalTypeUpdateInput).mutation(async ({ ctx, input }) => {
    const t = await ctx.db.journalType.findFirst({
      where: { id: input.id, userId: ctx.user.id },
    });
    if (!t) throw new TRPCError({ code: "NOT_FOUND" });
    const { id, ...patch } = input;
    return ctx.db.journalType.update({ where: { id }, data: patch });
  }),

  deleteType: onboardedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const t = await ctx.db.journalType.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!t) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.journalType.delete({ where: { id: input.id } });
      return { ok: true };
    }),

  listByRange: onboardedProcedure.input(journalRangeInput).query(({ ctx, input }) =>
    ctx.db.journalEntry.findMany({
      where: {
        userId: ctx.user.id,
        date: { gte: input.from, lte: input.to },
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    }),
  ),

  listByDate: onboardedProcedure.input(journalByDateInput).query(({ ctx, input }) =>
    ctx.db.journalEntry.findMany({
      where: { userId: ctx.user.id, date: input.date },
      orderBy: { createdAt: "asc" },
    }),
  ),

  getEntry: onboardedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const entry = await ctx.db.journalEntry.findFirst({
      where: { id: input.id, userId: ctx.user.id },
      include: { type: true },
    });
    if (!entry) throw new TRPCError({ code: "NOT_FOUND" });
    return entry;
  }),

  createEntry: onboardedProcedure
    .input(journalCreateEntryInput)
    .mutation(async ({ ctx, input }) => {
      const type = await ctx.db.journalType.findFirst({
        where: { id: input.typeId, userId: ctx.user.id },
      });
      if (!type) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.journalEntry.create({
        data: {
          userId: ctx.user.id,
          typeId: input.typeId,
          date: input.date,
          title: input.title,
          content: input.content ?? "",
        },
      });
    }),

  updateEntry: onboardedProcedure
    .input(journalUpdateEntryInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      const e = await ctx.db.journalEntry.findFirst({ where: { id, userId: ctx.user.id } });
      if (!e) throw new TRPCError({ code: "NOT_FOUND" });
      if (patch.typeId) {
        const t = await ctx.db.journalType.findFirst({
          where: { id: patch.typeId, userId: ctx.user.id },
        });
        if (!t) throw new TRPCError({ code: "NOT_FOUND", message: "Type not found" });
      }
      return ctx.db.journalEntry.update({ where: { id }, data: patch });
    }),

  deleteEntry: onboardedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const e = await ctx.db.journalEntry.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!e) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.journalEntry.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
