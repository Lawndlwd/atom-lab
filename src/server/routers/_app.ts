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
import { rulesRouter } from "./rules";
import { dataRouter } from "./data";
import { badHabitsRouter } from "./badHabits";
import { groupsRouter } from "./groups";

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
  rules: rulesRouter,
  data: dataRouter,
  badHabits: badHabitsRouter,
  groups: groupsRouter,
});

export type AppRouter = typeof appRouter;
