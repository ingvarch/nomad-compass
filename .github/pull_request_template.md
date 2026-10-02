## What changes

<!-- What the change does for someone using ovoo, and why. Link the issue: Closes #123 -->

## Checklist

- [ ] The test for this change was written first and failed
- [ ] `bun run lint`, `bun run typecheck`, `bun test` and `bun run build:all` are green
- [ ] The title is a conventional commit: `feat(ui): ...`, `fix(api): ...`, `fix(exec): ...`

### If the change touches the server (`src/api`, `src/lib`, `src/entry.*`)

- [ ] Works on both targets: Workers (`bun run dev`) and Docker (`bun run dev:bun`)
- [ ] The Nomad token stays in the httpOnly cookie and never reaches a URL, a log line, a response body or browser storage
- [ ] A new Nomad API path is added to `VALID_NOMAD_PATHS` in `src/api/routes/nomad.ts`
- [ ] A new state-changing route is behind `csrfMiddleware`

### If the change touches the UI

- [ ] Checked in the light and the dark theme
- [ ] Screenshots are attached

### If the change adds configuration

- [ ] The variable is in the table in `docs/configuration.md`, `.dev.vars.example` and `docker-compose.yml`
- [ ] A secret is set with `wrangler secret put` in the Workers deploy steps
