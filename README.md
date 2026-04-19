# Identity

Self-hosted multi-user PWA for daily identity tracking, weekly review, and an append-only journal. Email/password auth, email allowlist, web-push notifications at each identity's scheduled time.

## Deploy

```sh
curl -O https://raw.githubusercontent.com/lawndlwd/atom-lab-identity/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/lawndlwd/atom-lab-identity/main/.env.example
mv .env.example .env
pnpm vapid   # or generate VAPID keys from any web-push-compatible tool
```

Edit `.env`:

```env
SESSION_COOKIE_SECURE=true
ALLOWED_EMAILS=you@example.com
OPEN_SIGNUP=false
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
VITE_VAPID_PUBLIC_KEY=...   # same as VAPID_PUBLIC_KEY
```

```sh
mkdir -p data
docker compose up -d
```

App listens on `127.0.0.1:5174`. Point your existing reverse proxy at it, e.g. Caddy:

```
identity.example.com {
    reverse_proxy 127.0.0.1:5174
}
```

Update:

```sh
docker compose pull && docker compose up -d
```

The image is pulled automatically from `ghcr.io/lawndlwd/atom-lab-identity:latest`. Prisma migrations run on container start.

## Development

Requirements: Node.js 20+, pnpm 10+.

```sh
pnpm install
pnpm db:migrate
pnpm vapid >> .env   # optional, for push
pnpm dev
```

- App: http://localhost:5173
- API: http://localhost:5174

## Stack

- **Frontend** — React 18, Vite 6, Tailwind v4, React Router
- **Backend** — Node.js, Hono, tRPC v11
- **Database** — SQLite (`better-sqlite3`), Prisma 7 with driver adapter
- **Editor** — BlockSuite (journal notes, CRDT)
- **Auth** — argon2 + DB-backed sessions, httpOnly cookie
- **PWA** — `vite-plugin-pwa`, web-push (VAPID), `node-cron` scheduler
