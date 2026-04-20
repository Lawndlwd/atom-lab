import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, onboardedProcedure } from "../trpc";
import { groupCreateInput, groupUpdateInput } from "../../shared/schema";

export const groupsRouter = router({
  list: onboardedProcedure.query(({ ctx }) =>
    ctx.db.group.findMany({
      where: { userId: ctx.user.id },
      orderBy: { joinedAt: "desc" },
    }),
  ),

  create: onboardedProcedure
    .input(groupCreateInput)
    .mutation(({ ctx, input }) => ctx.db.group.create({ data: { ...input, userId: ctx.user.id } })),

  update: onboardedProcedure.input(groupUpdateInput).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const existing = await ctx.db.group.findFirst({ where: { id, userId: ctx.user.id } });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    return ctx.db.group.update({ where: { id }, data: rest });
  }),

  delete: onboardedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.group.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.group.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
