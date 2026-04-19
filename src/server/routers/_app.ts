import { router, publicProcedure } from "../trpc";
import { authRouter } from "./auth";
import { onboardingRouter } from "./onboarding";
import { identityRouter } from "./identity";
import { voteRouter } from "./vote";
import { reviewRouter } from "./review";
import { journalRouter } from "./journal";
import { blocksuiteRouter } from "./blocksuite";
import { habitsRouter } from "./habits";
import { pushRouter } from "./push";

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true, time: new Date().toISOString() })),
  auth: authRouter,
  onboarding: onboardingRouter,
  identity: identityRouter,
  vote: voteRouter,
  review: reviewRouter,
  journal: journalRouter,
  blocksuite: blocksuiteRouter,
  habits: habitsRouter,
  push: pushRouter,
});

export type AppRouter = typeof appRouter;
