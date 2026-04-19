import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, onboardedProcedure } from "../trpc";
import {
  journalCreateEntryInput,
  journalTypeInput,
  journalUpdateEntryInput,
} from "../../shared/schema";

function docIdFor(userId: string, entryId: string) {
  return `journal-${userId}-${entryId}`;
}
function rootIdFor(userId: string) {
  return `root-${userId}`;
}

export const journalRouter = router({
  listTypes: onboardedProcedure.query(({ ctx }) =>
    ctx.db.journalType.findMany({
      where: { userId: ctx.user.id },
      orderBy: { order: "asc" },
    }),
  ),

  createType: onboardedProcedure.input(journalTypeInput).mutation(async ({ ctx, input }) => {
    return ctx.db.journalType.create({
      data: { ...input, userId: ctx.user.id },
    });
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

  listEntries: onboardedProcedure
    .input(z.object({ typeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const type = await ctx.db.journalType.findFirst({
        where: { id: input.typeId, userId: ctx.user.id },
      });
      if (!type) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.journalEntry.findMany({
        where: { userId: ctx.user.id, typeId: input.typeId },
        orderBy: { createdAt: "desc" },
      });
    }),

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
      const entryId = `e_${crypto.randomUUID().slice(0, 12)}`;
      const docId = docIdFor(ctx.user.id, entryId);
      const entry = await ctx.db.$transaction(async (tx) => {
        await tx.blockSuiteDoc.create({
          data: { id: docId, userId: ctx.user.id, state: Buffer.from([]) },
        });
        return tx.journalEntry.create({
          data: {
            id: entryId,
            userId: ctx.user.id,
            typeId: input.typeId,
            title: input.title,
            status: "idea",
            bsDocId: docId,
          },
        });
      });
      return entry;
    }),

  updateEntry: onboardedProcedure
    .input(journalUpdateEntryInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...patch } = input;
      const e = await ctx.db.journalEntry.findFirst({ where: { id, userId: ctx.user.id } });
      if (!e) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.journalEntry.update({ where: { id }, data: patch });
    }),

  deleteEntry: onboardedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const e = await ctx.db.journalEntry.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!e) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.$transaction([
        ctx.db.journalEntry.delete({ where: { id: input.id } }),
        ctx.db.blockSuiteDoc.delete({ where: { id: e.bsDocId } }),
      ]);
      return { ok: true };
    }),
});

export const journalRootHelpers = { docIdFor, rootIdFor };
