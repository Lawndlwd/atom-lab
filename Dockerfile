FROM node:20-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@10.29.2 --activate
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates tini \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ----- builder: compiles native deps (better-sqlite3) + builds client/server -----
FROM base AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY pnpm-lock.yaml package.json ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# keep only prod deps in node_modules; drops tsx/vite/typescript/etc.
RUN pnpm prune --prod

# ----- runtime: slim image, no compilers, reuses builder's node_modules -----
FROM base AS runtime
ENV NODE_ENV=production

COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/public ./public

RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

ENV PORT=5174
EXPOSE 5174

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-lc", "pnpm db:deploy && node dist/server/server/main.js"]
