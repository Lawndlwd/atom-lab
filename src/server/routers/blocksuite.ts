import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, onboardedProcedure } from "../trpc";

function isOwnedDoc(docId: string, userId: string): boolean {
  return (
    docId === `root-${userId}` ||
    docId.startsWith(`journal-${userId}-`) ||
    docId.startsWith(`coll-${userId}-`)
  );
}

export const blocksuiteRouter = router({
  getSnapshot: onboardedProcedure
    .input(z.object({ docId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      if (!isOwnedDoc(input.docId, ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const doc = await ctx.db.blockSuiteDoc.findUnique({ where: { id: input.docId } });
      if (!doc) return { docId: input.docId, state: null as number[] | null };
      if (doc.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      return { docId: input.docId, state: Array.from(doc.state) };
    }),

  saveSnapshot: onboardedProcedure
    .input(
      z.object({
        docId: z.string().min(1),
        state: z.array(z.number().int().min(0).max(255)),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isOwnedDoc(input.docId, ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const bytes = Buffer.from(input.state);
      const existing = await ctx.db.blockSuiteDoc.findUnique({ where: { id: input.docId } });
      if (existing && existing.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const saved = await ctx.db.blockSuiteDoc.upsert({
        where: { id: input.docId },
        create: { id: input.docId, userId: ctx.user.id, state: bytes },
        update: { state: bytes },
      });

      const recentSnapshots = await ctx.db.blockSuiteSnapshot.findMany({
        where: { docId: input.docId },
        orderBy: { createdAt: "desc" },
        take: 1,
      });
      const lastCreated = recentSnapshots[0]?.createdAt ?? new Date(0);
      if (Date.now() - lastCreated.getTime() > 5 * 60 * 1000) {
        await ctx.db.blockSuiteSnapshot.create({
          data: { docId: input.docId, state: bytes },
        });
      }
      return { docId: saved.id, updatedAt: saved.updatedAt };
    }),

  registerSubdoc: onboardedProcedure
    .input(z.object({ docId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.blockSuiteDoc.findUnique({ where: { id: input.docId } });
      if (existing) {
        if (existing.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        return { ok: true };
      }
      await ctx.db.blockSuiteDoc.create({
        data: { id: input.docId, userId: ctx.user.id, state: Buffer.from([]) },
      });
      return { ok: true };
    }),
});
