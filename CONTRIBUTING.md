# Contributing

Thanks for helping. Keep PRs small and scoped.

## Setup

```sh
pnpm install
pnpm db:migrate
pnpm dev
```

## Before opening a PR

```sh
pnpm check    # typecheck + lint + format:check
```

If formatting fails, run `pnpm format`.

## Branch + commit

- Branch from `main`. One topic per PR.
- Commit messages: short imperative subject (≤72 chars). Body optional; explain _why_, not _what_.

## Tests

No formal test suite yet. If you touch `src/shared/streak.ts` or `src/shared/rule.ts` (pure logic), add a small `.test.ts` next to it and wire up vitest.

## Style

- TypeScript strict mode. No `any` without a `// why` comment.
- Server-side input: Zod at every tRPC procedure boundary.
- Client-side mutations: optimistic where it makes sense, always rollback on error.
- No silencers. Don't add `@ts-ignore`, `ignoreDeprecations`, or version pins to shut warnings up — fix the root cause or document a migration task.

## Reporting bugs / asking for features

Use the issue templates. Security issues — see `SECURITY.md`, do not open a public issue.
