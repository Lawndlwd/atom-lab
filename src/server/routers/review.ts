import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, onboardedProcedure } from "../trpc";
import { reviewSetAnswerInput } from "../../shared/schema";
import { REVIEW_QUESTIONS } from "../../shared/constants";
import { isoWeekInTz } from "../../shared/dates";

const weekKey = z.object({ year: z.number().int(), weekNumber: z.number().int() });

export const reviewRouter = router({
  current: onboardedProcedure.query(async ({ ctx }) => {
    const tz = ctx.user.timezone || "UTC";
    const { year, week } = isoWeekInTz(tz);
    const existing = await ctx.db.review.findUnique({
      where: { userId_year_weekNumber: { userId: ctx.user.id, year, weekNumber: week } },
    });
    return { year, weekNumber: week, review: existing, questions: REVIEW_QUESTIONS };
  }),

  get: onboardedProcedure.input(weekKey).query(async ({ ctx, input }) => {
    const existing = await ctx.db.review.findUnique({
      where: {
        userId_year_weekNumber: {
          userId: ctx.user.id,
          year: input.year,
          weekNumber: input.weekNumber,
        },
      },
    });
    return {
      year: input.year,
      weekNumber: input.weekNumber,
      review: existing,
      questions: REVIEW_QUESTIONS,
    };
  }),

  setAnswer: onboardedProcedure.input(reviewSetAnswerInput).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.review.findUnique({
      where: {
        userId_year_weekNumber: {
          userId: ctx.user.id,
          year: input.year,
          weekNumber: input.weekNumber,
        },
      },
    });
    if (existing?.completedAt) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Review is locked." });
    }
    const answers = existing ? (JSON.parse(existing.answers) as Record<string, string>) : {};
    answers[input.key] = input.text;
    const review = existing
      ? await ctx.db.review.update({
          where: { id: existing.id },
          data: { answers: JSON.stringify(answers) },
        })
      : await ctx.db.review.create({
          data: {
            userId: ctx.user.id,
            year: input.year,
            weekNumber: input.weekNumber,
            answers: JSON.stringify(answers),
          },
        });
    return review;
  }),

  complete: onboardedProcedure.input(weekKey).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.review.findUnique({
      where: {
        userId_year_weekNumber: {
          userId: ctx.user.id,
          year: input.year,
          weekNumber: input.weekNumber,
        },
      },
    });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
    if (existing.completedAt) return existing;
    return ctx.db.review.update({
      where: { id: existing.id },
      data: { completedAt: new Date() },
    });
  }),

  list: onboardedProcedure.query(async ({ ctx }) => {
    return ctx.db.review.findMany({
      where: { userId: ctx.user.id },
      orderBy: [{ year: "desc" }, { weekNumber: "desc" }],
      take: 20,
    });
  }),
});
