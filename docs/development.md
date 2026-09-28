# Development

Two development modes are available, matching the two deployment targets.

## Cloudflare Workers development

Uses Wrangler to emulate the Cloudflare Workers environment locally.

```bash
bun run dev          # Vite (frontend) + Wrangler (API)
```

Configure your Nomad server and ticket secret in `.dev.vars` (see
[Configuration](configuration.md)).

## Bun development

Uses the Bun backend directly, useful for Docker deployment testing.
`NOMAD_ADDR` and `TICKET_SECRET` come from the environment, and the server
does not start without `TICKET_SECRET`:

```bash
NOMAD_ADDR=http://localhost:4646 TICKET_SECRET=$(openssl rand -hex 32) bun run dev:bun
```

## Other commands

```bash
bun run dev:vite     # Vite only (no backend)
bun run dev:worker   # Wrangler only (no frontend dev)
bun run dev:api      # Bun API only

bun run build        # Build frontend
bun run build:bun    # Build Bun server
bun run build:all    # Build both

bun run lint         # Run ESLint
bun run typecheck    # Run TypeScript type checking
bun test             # Run tests
```

## Project structure

```
src/
├── api/                 # Hono API layer
│   ├── app.ts           # App factory
│   ├── routes/          # Auth routes and the Nomad API proxy
│   ├── handlers/        # Remote exec WebSocket relay
│   ├── middleware/      # Auth, CSRF, rate limits, security headers
│   └── utils/           # Cookies, crypto, responses
├── client/              # React SPA
│   ├── pages/           # Page components
│   ├── components/      # Reusable components
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Utilities and API client
│   ├── context/         # React contexts
│   └── types/           # Nomad API types
├── lib/                 # Bun server setup
├── shared/              # Types shared by API and client
├── entry.cloudflare.ts  # Cloudflare Workers entry
├── entry.bun.ts         # Bun production entry
└── entry.bun.dev.ts     # Bun dev entry (API only)
```

## Tech stack

- **Runtime**: [Bun](https://bun.sh/) — JavaScript runtime, package manager
  and bundler.
- **API**: [Hono](https://hono.dev/) — lightweight web framework.
- **Frontend**: React 19 + React Router 7 + Tailwind CSS v4.
- **Build**: Vite (frontend) + Bun bundler (backend).
- **Deploy**: Cloudflare Workers or Docker (Bun).
