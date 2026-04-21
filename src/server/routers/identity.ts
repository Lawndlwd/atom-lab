import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, onboardedProcedure } from "../trpc";
import { identityCreate, identityUpdate } from "../../shared/schema";

export const identityRouter = router({
  listActive: onboardedProcedure.query(async ({ ctx }) => {
    return ctx.db.identity.findMany({
      where: { userId: ctx.user.id, status: "active" },
      orderBy: { scheduledTime: "asc" },
    });
  }),

  listAll: onboardedProcedure.query(async ({ ctx }) => {
    return ctx.db.identity.findMany({
      where: { userId: ctx.user.id },
      orderBy: [{ status: "asc" }, { scheduledTime: "asc" }],
    });
  }),

  create: onboardedProcedure.input(identityCreate).mutation(async ({ ctx, input }) => {
    return ctx.db.identity.create({
      data: { ...input, userId: ctx.user.id },
    });
  }),

  update: onboardedProcedure.input(identityUpdate).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const existing = await ctx.db.identity.findFirst({ where: { id, userId: ctx.user.id } });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    return ctx.db.identity.update({ where: { id }, data: rest });
  }),

  archive: onboardedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.identity.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.identity.update({
        where: { id: input.id },
        data: { status: "archived", archivedAt: new Date() },
      });
    }),

  unarchive: onboardedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.identity.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.db.identity.update({
        where: { id: input.id },
        data: { status: "active", archivedAt: null },
      });
    }),
});
