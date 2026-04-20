import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { onboardingInput } from "../../shared/schema";

export const onboardingRouter = router({
  complete: protectedProcedure.input(onboardingInput).mutation(async ({ ctx, input }) => {
    if (ctx.user.onboardedAt) {
      throw new TRPCError({ code: "CONFLICT", message: "Already onboarded." });
    }

    await ctx.db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: ctx.user.id },
        data: {
          name: input.name,
          timezone: input.timezone,
          onboardedAt: new Date(),
        },
      });

      await tx.identity.createMany({
        data: input.identities.map((i) => ({
          userId: ctx.user.id,
          statement: i.statement,
          action: i.action,
          scheduledTime: i.scheduledTime,
          cadence: i.cadence,
        })),
      });

      await tx.journalType.createMany({
        data: input.journalTypes.map((t) => ({
          userId: ctx.user.id,
          slug: t.slug,
          label: t.label,
          order: t.order ?? 0,
        })),
      });

      await tx.config.create({
        data: {
          userId: ctx.user.id,
          ruleText:
            input.config.ruleText ??
            "One new habit per month. All active must hold 14 days before unlock.",
          newHabitCooldown: input.config.newHabitCooldown ?? 30,
          minimumStreak: input.config.minimumStreak ?? 14,
          maxActiveHabits: input.config.maxActiveHabits ?? 5,
        },
      });
    });

    return { ok: true };
  }),

  reset: protectedProcedure
    .input(z.object({ confirm: z.literal(true) }))
    .mutation(async ({ ctx }) => {
      await ctx.db.$transaction(async (tx) => {
        await tx.vote.deleteMany({ where: { userId: ctx.user.id } });
        await tx.pushLog.deleteMany({ where: { userId: ctx.user.id } });
        await tx.identity.deleteMany({ where: { userId: ctx.user.id } });
        await tx.habitBacklog.deleteMany({ where: { userId: ctx.user.id } });
        await tx.rule.deleteMany({ where: { userId: ctx.user.id } });
        await tx.review.deleteMany({ where: { userId: ctx.user.id } });
        await tx.journalType.deleteMany({ where: { userId: ctx.user.id } });
        await tx.blockSuiteDoc.deleteMany({ where: { userId: ctx.user.id } });
        await tx.config.deleteMany({ where: { userId: ctx.user.id } });
        await tx.user.update({
          where: { id: ctx.user.id },
          data: { onboardedAt: null },
        });
      });
      return { ok: true };
    }),
});
