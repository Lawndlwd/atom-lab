# Architecture

Single Vite app with a co-located Hono/tRPC server. One process, one Docker image.

## Repo layout

```
src/
  client/                # React + Vite
    features/            # one folder per screen
    providers/           # auth, theme, push
    components/          # shared UI
    styles/              # tokens.css (dark + light) + utilities
    sw.ts                # service worker (precache, push, click)
  server/                # Hono + tRPC
    routers/             # one file per domain
    auth/                # argon2, sessions, allowlist
    push/                # VAPID helper + cron scheduler
    main.ts              # entry: /trpc, /api/push/ack, static serve
  shared/                # Zod schemas, dates, streak, rule (pure)
prisma/
  schema.prisma          # SQLite schema; no url (Prisma 7 driver adapter)
  migrations/
prisma.config.ts         # datasource.url via env(), driver adapter
```

## Data flow

- Client → `/trpc/<router>.<proc>` via `@trpc/react-query`.
- Server validates with Zod (`src/shared/schema.ts`), talks to Prisma (SQLite via `@prisma/adapter-better-sqlite3`).
- Session cookie `sid` → looked up in `Session` table on every request (`src/server/context.ts`).
- BlockSuite docs (journal) persist as `Bytes` snapshots; the client debounces Y.js CRDT updates and replays state on load.

## Push

- VAPID keypair in `.env`. Client subscribes via `PushManager`, POSTs to `push.subscribe`.
- `node-cron` runs every minute on the server: per onboarded user → find identities whose `scheduledTime` matches now-in-their-tz → send to all their `PushSubscription`s → log to `PushLog` for same-day idempotency.
- Notification action `Mark done` posts to `/api/push/ack`, which upserts today's `Vote`.

## Deploy

- `main` push → GitHub Actions build + push image to `ghcr.io/<owner>/<repo>:latest`.
- On the server, `docker compose pull && up -d` pulls the new image.
- Container entrypoint runs `pnpm db:deploy` (Prisma migrations) then starts the server.
- SQLite lives on a bind-mounted `./data` volume.
- User's existing reverse proxy terminates TLS and proxies to `127.0.0.1:5174`.
