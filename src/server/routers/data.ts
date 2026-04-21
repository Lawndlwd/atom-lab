import { router, onboardedProcedure } from "../trpc";
import { importInput } from "../../shared/schema";

export const dataRouter = router({
  import: onboardedProcedure.input(importInput).mutation(async ({ ctx, input }) => {
    const counts = { identities: 0, backlog: 0, journalTypes: 0, rules: 0, badHabits: 0 };

    await ctx.db.$transaction(async (tx) => {
      if (input.identities?.length) {
        await tx.identity.createMany({
          data: input.identities.map((i) => ({
            userId: ctx.user.id,
            statement: i.statement,
            action: i.action,
            scheduledTime: i.scheduledTime,
            cadence: i.cadence,
            cueLocation: i.cueLocation ?? null,
            stackAfter: i.stackAfter ?? null,
            mindsetReframe: i.mindsetReframe ?? null,
            immediateReward: i.immediateReward ?? null,
          })),
        });
        counts.identities = input.identities.length;
      }
      if (input.backlog?.length) {
        await tx.habitBacklog.createMany({
          data: input.backlog.map((b) => ({
            userId: ctx.user.id,
            statement: b.statement,
            action: b.action,
            cadence: b.cadence,
            scheduledTime: b.scheduledTime ?? null,
          })),
        });
        counts.backlog = input.backlog.length;
      }
      if (input.journalTypes?.length) {
        const existing = await tx.journalType.findMany({
          where: { userId: ctx.user.id },
          select: { slug: true },
        });
        const skip = new Set(existing.map((e) => e.slug));
        const toAdd = input.journalTypes.filter((t) => !skip.has(t.slug));
        if (toAdd.length) {
          await tx.journalType.createMany({
            data: toAdd.map((t, i) => ({
              userId: ctx.user.id,
              slug: t.slug,
              label: t.label,
              color: t.color ?? "#7cb5a5",
              order: t.order ?? i,
            })),
          });
        }
        counts.journalTypes = toAdd.length;
      }
      if (input.rules?.length) {
        const base = await tx.rule.count({ where: { userId: ctx.user.id } });
        await tx.rule.createMany({
          data: input.rules.map((r, i) => ({
            userId: ctx.user.id,
            text: r.text.trim(),
            description: r.description?.trim() || null,
            cadence: r.cadence ?? null,
            scheduledTime: r.scheduledTime ?? null,
            order: base + i,
          })),
        });
        counts.rules = input.rules.length;
      }
      if (input.badHabits?.length) {
        await tx.badHabit.createMany({
          data: input.badHabits.map((b) => ({
            userId: ctx.user.id,
            name: b.name,
            description: b.description ?? null,
            invisibleAction: b.invisibleAction ?? null,
            unattractiveReframe: b.unattractiveReframe ?? null,
            difficultAction: b.difficultAction ?? null,
            unsatisfyingConsequence: b.unsatisfyingConsequence ?? null,
          })),
        });
        counts.badHabits = input.badHabits.length;
      }
    });

    return { ok: true, counts };
  }),
});
