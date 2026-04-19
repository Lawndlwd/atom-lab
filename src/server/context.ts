import { parse as parseCookie } from "cookie";
import type { Context as HonoContext } from "hono";
import { db } from "./db";

const COOKIE = process.env.SESSION_COOKIE_NAME ?? "sid";

export async function createContext({ c }: { c: HonoContext }) {
  const header = c.req.header("cookie") ?? "";
  const cookies = parseCookie(header);
  const sid = cookies[COOKIE];

  let user = null as Awaited<ReturnType<typeof db.user.findUnique>>;
  if (sid) {
    const session = await db.session.findUnique({
      where: { id: sid },
      include: { user: true },
    });
    if (session && session.expiresAt > new Date()) {
      user = session.user;
    }
  }
  return { c, db, user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
