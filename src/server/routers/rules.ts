import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, onboardedProcedure } from "../trpc";
import { ruleCreateInput, ruleUpdateInput } from "../../shared/schema";

export const rulesRouter = router({
  list: onboardedProcedure.query(({ ctx }) =>
    ctx.db.rule.findMany({
      where: { userId: ctx.user.id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
  ),

  create: onboardedProcedure.input(ruleCreateInput).mutation(async ({ ctx, input }) => {
    const count = await ctx.db.rule.count({ where: { userId: ctx.user.id } });
    return ctx.db.rule.create({
      data: {
        userId: ctx.user.id,
        text: input.text.trim(),
        description: input.description?.trim() || null,
        cadence: input.cadence ?? null,
        scheduledTime: input.scheduledTime ?? null,
        order: count,
      },
    });
  }),

  update: onboardedProcedure.input(ruleUpdateInput).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const r = await ctx.db.rule.findFirst({ where: { id, userId: ctx.user.id } });
    if (!r) throw new TRPCError({ code: "NOT_FOUND" });
    return ctx.db.rule.update({
      where: { id },
      data: {
        ...rest,
        text: rest.text?.trim(),
        description: rest.description === undefined ? undefined : rest.description?.trim() || null,
      },
    });
  }),

  delete: onboardedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const r = await ctx.db.rule.findFirst({ where: { id: input.id, userId: ctx.user.id } });
      if (!r) throw new TRPCError({ code: "NOT_FOUND" });
      await ctx.db.rule.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
