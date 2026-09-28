# Configuration

## Environment variables

| Variable | Description | Default | Used in |
|----------|-------------|---------|---------|
| `NOMAD_ADDR` | Nomad API address | Docker: `http://localhost:4646`. Workers: none, required | Both targets |
| `TICKET_SECRET` | HMAC secret for remote exec tickets (`openssl rand -hex 32`) | None, required | Both targets |
| `ALLOWED_ORIGINS` | Comma-separated origins allowed by CORS | `http://localhost:5173,http://localhost:3000` | Workers only |
| `PORT` | Port of the Bun server | `3000` | Docker, `bun run dev:bun` |

`bun run dev:bun` expects the Bun server on port 3000: the Vite dev proxy is
fixed to it.

## Ticket secret

`TICKET_SECRET` is required everywhere, including local development. Without
it the Docker server does not start, and on Cloudflare Workers remote exec
fails:

```bash
# Generate a secure secret
openssl rand -hex 32
```

On Workers it is set with `wrangler secret put TICKET_SECRET`, see
[Deployment](deployment.md).

## Local development

For Wrangler development, copy `.dev.vars.example` to `.dev.vars` and fill
in your values:

```bash
cp .dev.vars.example .dev.vars
# then set TICKET_SECRET to the output of: openssl rand -hex 32
```

For Bun development, pass the variables in the environment:

```bash
NOMAD_ADDR=http://localhost:4646 TICKET_SECRET=$(openssl rand -hex 32) bun run dev:bun
```
