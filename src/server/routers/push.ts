import { z } from "zod";
import { router, publicProcedure, onboardedProcedure } from "../trpc";
import { pushSubscribeInput } from "../../shared/schema";
import { sendPush, vapidConfigured } from "../push/webpush";

export const pushRouter = router({
  vapidPublicKey: publicProcedure.query(() => ({
    key: process.env.VAPID_PUBLIC_KEY ?? "",
    configured: vapidConfigured,
  })),

  subscribe: onboardedProcedure.input(pushSubscribeInput).mutation(async ({ ctx, input }) => {
    await ctx.db.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        userId: ctx.user.id,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent,
      },
      update: {
        userId: ctx.user.id,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent,
      },
    });
    return { ok: true };
  }),

  unsubscribe: onboardedProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.pushSubscription.deleteMany({
        where: { userId: ctx.user.id, endpoint: input.endpoint },
      });
      return { ok: true };
    }),

  listSubs: onboardedProcedure.query(({ ctx }) =>
    ctx.db.pushSubscription.findMany({ where: { userId: ctx.user.id } }),
  ),

  test: onboardedProcedure.mutation(async ({ ctx }) => {
    const subs = await ctx.db.pushSubscription.findMany({ where: { userId: ctx.user.id } });
    let sent = 0;
    for (const s of subs) {
      try {
        await sendPush(s, {
          title: "Identity",
          body: "Test notification. Hello from your future self.",
          tag: "test",
        });
        sent += 1;
      } catch (e: unknown) {
        const err = e as { statusCode?: number };
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await ctx.db.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        }
      }
    }
    return { sent, total: subs.length };
  }),

  ack: onboardedProcedure
    .input(
      z.object({
        identityId: z.string(),
        action: z.enum(["done", "partial", "snooze"]),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = await ctx.db.identity.findFirst({
        where: { id: input.identityId, userId: ctx.user.id },
      });
      if (!id) return { ok: false };
      if (input.action === "done" || input.action === "partial") {
        const isPartial = input.action === "partial";
        await ctx.db.vote.upsert({
          where: { identityId_date: { identityId: id.id, date: input.date } },
          create: {
            identityId: id.id,
            userId: ctx.user.id,
            date: input.date,
            done: true,
            partial: isPartial,
          },
          update: { done: true, partial: isPartial },
        });
      }
      return { ok: true };
    }),
});
