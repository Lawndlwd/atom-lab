import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { trpcServer } from "@hono/trpc-server";
import { serveStatic } from "@hono/node-server/serve-static";
import path from "node:path";
import fs from "node:fs";
import { appRouter } from "./routers/_app";
import { createContext } from "./context";
import { startPushScheduler } from "./push/scheduler";
import { db } from "./db";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "./auth/sessions";

const PORT = Number(process.env.PORT ?? 5174);
const isProd = process.env.NODE_ENV === "production";

const app = new Hono();

app.use("*", logger());

if (!isProd) {
  app.use(
    "*",
    cors({
      origin: (origin) => origin ?? "*",
      credentials: true,
    }),
  );
}

app.get("/health", (c) => c.json({ ok: true }));

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, c) => createContext({ c }),
  }),
);

app.post("/api/push/ack", async (c) => {
  const header = c.req.header("cookie") ?? "";
  const cookies = parseCookie(header);
  const sid = cookies[COOKIE_NAME];
  if (!sid) return c.json({ ok: false, error: "unauth" }, 401);
  const session = await db.session.findUnique({ where: { id: sid } });
  if (!session || session.expiresAt < new Date())
    return c.json({ ok: false, error: "expired" }, 401);

  const body = (await c.req.json()) as { identityId?: string; action?: string; date?: string };
  if (!body.identityId || body.action !== "done" || !body.date) {
    return c.json({ ok: false, error: "bad_request" }, 400);
  }
  const id = await db.identity.findFirst({
    where: { id: body.identityId, userId: session.userId },
  });
  if (!id) return c.json({ ok: false }, 404);

  await db.vote.upsert({
    where: { identityId_date: { identityId: id.id, date: body.date } },
    create: { identityId: id.id, userId: session.userId, date: body.date, done: true },
    update: { done: true },
  });
  return c.json({ ok: true });
});

if (isProd) {
  const clientDir = path.resolve(process.cwd(), "dist/client");
  if (fs.existsSync(clientDir)) {
    app.use("/*", serveStatic({ root: "dist/client" }));
    app.get("*", async (c) => {
      const html = await fs.promises.readFile(path.join(clientDir, "index.html"), "utf8");
      return c.html(html);
    });
  }
}

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`[server] listening on http://localhost:${info.port}`);
  startPushScheduler();
});
