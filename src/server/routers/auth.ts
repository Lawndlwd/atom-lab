import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc";
import { signInInput, signUpInput } from "../../shared/schema";
import { hashPassword, verifyPassword } from "../auth/password";
import {
  COOKIE_NAME,
  clearedCookieAttrs,
  cookieAttrs,
  createSession,
  deleteSession,
} from "../auth/sessions";
import { isEmailAllowed } from "../auth/allowlist";
import { parse as parseCookie } from "cookie";

function publicUser<
  T extends { id: string; email: string; name: string; onboardedAt: Date | null; timezone: string },
>(u: T) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    onboardedAt: u.onboardedAt,
    timezone: u.timezone,
  };
}

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => (ctx.user ? publicUser(ctx.user) : null)),

  signUp: publicProcedure.input(signUpInput).mutation(async ({ ctx, input }) => {
    if (!isEmailAllowed(input.email)) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Signup is restricted. Ask for access." });
    }
    const existing = await ctx.db.user.findUnique({ where: { email: input.email } });
    if (existing)
      throw new TRPCError({ code: "CONFLICT", message: "Email is already registered." });

    const passwordHash = await hashPassword(input.password);
    const user = await ctx.db.user.create({
      data: { email: input.email, passwordHash, name: input.name, timezone: "UTC" },
    });
    const session = await createSession(user.id);
    ctx.c.header("Set-Cookie", `${COOKIE_NAME}=${session.id}; ${cookieAttrs(session.expiresAt)}`, {
      append: true,
    });
    return publicUser(user);
  }),

  signIn: publicProcedure.input(signInInput).mutation(async ({ ctx, input }) => {
    const user = await ctx.db.user.findUnique({ where: { email: input.email } });
    if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
    const ok = await verifyPassword(user.passwordHash, input.password);
    if (!ok) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });

    const session = await createSession(user.id);
    ctx.c.header("Set-Cookie", `${COOKIE_NAME}=${session.id}; ${cookieAttrs(session.expiresAt)}`, {
      append: true,
    });
    return publicUser(user);
  }),

  signOut: protectedProcedure.mutation(async ({ ctx }) => {
    const header = ctx.c.req.header("cookie") ?? "";
    const cookies = parseCookie(header);
    const sid = cookies[COOKIE_NAME];
    if (sid) await deleteSession(sid);
    ctx.c.header("Set-Cookie", `${COOKIE_NAME}=; ${clearedCookieAttrs()}`, { append: true });
    return { ok: true };
  }),
});
