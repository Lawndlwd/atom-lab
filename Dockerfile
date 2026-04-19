FROM node:20-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@10.29.2 --activate
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates tini \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS builder
COPY pnpm-lock.yaml package.json ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

RUN mkdir -p /app/data && chown -R node:node /app/data
USER node

ENV PORT=5174
EXPOSE 5174

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sh", "-lc", "pnpm db:deploy && node dist/server/server/main.js"]
