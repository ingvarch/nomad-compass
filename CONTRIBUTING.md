# Contributing to Nomad Compass

Bug reports, ideas and pull requests are welcome. A security problem is
reported privately, not in an issue: see [SECURITY.md](SECURITY.md).

## Before you write code

For anything bigger than a small fix, open an issue first, so the shape of
the change is agreed before the work is done.

## Build and run

You need [Bun](https://bun.sh/) 1.2+ and a running Nomad cluster with an ACL
token:

```sh
bun install
bun run dev
```

```sh
bun run lint        # ESLint
bun run typecheck   # tsc --noEmit
bun test            # tests
bun run build:all   # frontend + Bun server
```

All four are green before every commit — CI does not run them yet.

## How a change is made

- The test comes first. Write the test that names the behaviour, watch it
  fail, then write the smallest code that passes it. This holds for small
  functions too.
- Keep both deployment targets working: Cloudflare Workers and Docker. A
  server change is verified against both entries (`entry.cloudflare.ts`,
  `entry.bun.ts`).
- The Nomad token stays in the `httpOnly` cookie and never reaches a URL, a
  log line, a response body or browser storage.
- Comments are short and say why, not what the line does.

## Commits and pull requests

Commit messages and pull request titles are conventional commits, with the
part of the app as the scope: `feat(ui): ...`, `fix(api): ...`,
`fix(exec): ...`, `chore(deps): ...`.

One pull request is one change. Fill in the pull request template — every
section that applies.
