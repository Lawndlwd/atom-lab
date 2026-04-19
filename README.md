# Identity

Personal tracking / journaling / habits PWA. TypeScript + React + Vite + tRPC + SQLite + BlockSuite. Multi-user, email/password auth with env-gated signup, web-push notifications.

## Local dev

```bash
pnpm install
pnpm db:migrate
pnpm vapid >> .env     # (optional) generate VAPID keys for push
pnpm dev
```

- Vite client: http://localhost:5173
- Hono/tRPC server: http://localhost:5174
- SQLite file: `./data/identity.db`

## Env

Copy `.env.example` to `.env` and fill in:

| Var                     | Purpose                                                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | SQLite file path (relative to `prisma/schema.prisma`). Default `file:../data/identity.db` = `./data/identity.db` from repo root. |
| `PORT`                  | API port (default 5174).                                                                                                         |
| `SESSION_COOKIE_SECURE` | `true` in prod to require HTTPS.                                                                                                 |
| `ALLOWED_EMAILS`        | Comma-separated allowlist (signup-only).                                                                                         |
| `OPEN_SIGNUP`           | `true` to disable the allowlist entirely.                                                                                        |
| `VAPID_*`               | Web-push keys. Generate via `pnpm vapid`.                                                                                        |
| `VITE_VAPID_PUBLIC_KEY` | Same public key, exposed to the browser.                                                                                         |

## Stack

- React Router, Tailwind v4 (CSS-first), Fraunces/Inter/Geist Mono.
- tRPC v11 over Hono, superjson.
- Prisma + SQLite (`better-sqlite3`), argon2 (`@node-rs/argon2`).
- `vite-plugin-pwa` (injectManifest), custom service worker.
- `web-push` + `node-cron` — scheduler sends lock-screen notifications at each identity's scheduled time.
- BlockSuite (`@blocksuite/presets`) for journal entry notes; CRDT snapshots persisted as `Bytes` in SQLite.

## Deploy (self-hosted VPS + Caddy)

1. Point DNS A record → VPS (e.g. `identity.you.com`).
2. On the server, clone repo + create `.env`:
   ```
   cp .env.example .env
   # fill VAPID_*, ALLOWED_EMAILS, VAPID_SUBJECT (mailto:…)
   ```
3. Set the public domain for Caddy:
   ```
   echo "DOMAIN=identity.you.com" >> .env
   ```
4. Bring it up:

   ```
   docker compose up -d --build
   ```

   - Caddy auto-provisions HTTPS from Let's Encrypt.
   - SQLite lives on `./data` (bind-mounted). Persists across `down/up`.

5. Inspect logs: `docker compose logs -f app caddy`.
6. Migrations apply automatically on container start (`prisma migrate deploy`).

### Updating

```
git pull
docker compose up -d --build
```

### Opening signup temporarily

```
docker compose exec app sh -lc 'OPEN_SIGNUP=true node dist/server/server/main.js'
# or edit .env and docker compose restart app
```

## Design

Source of truth for visual language: `./design/Identity Hi-Fi.html` + `./design/hifi/*.jsx`. Open the HTML in a browser to compare against the live app.

## What's here

- `/signin`, `/signup` — auth gate with allowlist.
- `/onboarding` — 6-step wizard capturing identities, journal types, rule.
- `/today` — timeline, check off votes.
- `/week` — streak strips across the ISO week.
- `/review` — 5-question Sunday review with autosave + lock.
- `/journal` — per-user journal types as tabs, entries open a BlockSuite editor.
- `/habits` — rule banner + active list + locked backlog.
- `/settings` — push toggle, logout.
