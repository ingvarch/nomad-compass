# Configuration

## Environment variables

| Variable | Description | Default | Used in |
|----------|-------------|---------|---------|
| `NOMAD_ADDR` | Nomad server address | `http://localhost:4646` | Both targets |
| `PORT` | Server port | `3000` | Docker only |
| `TICKET_SECRET` | HMAC secret for WebSocket auth tickets (`openssl rand -hex 32`) | None, required | Both targets |

## Ticket secret

`TICKET_SECRET` is required everywhere, including local development. Without
it the Docker server does not start, and on Cloudflare Workers remote exec
fails:

```bash
# Generate a secure secret
openssl rand -hex 32

# Set in your environment
export TICKET_SECRET="your-generated-secret"
```

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

## Cloudflare Workers

Secrets are set with Wrangler, never committed:

```bash
wrangler secret put NOMAD_ADDR
# Enter: https://your-nomad-server.example.com

wrangler secret put TICKET_SECRET
# Enter the output of: openssl rand -hex 32
```

A custom domain is an optional `wrangler.toml` addition:

```toml
routes = [
  { pattern = "nomad.example.com", custom_domain = true }
]
```
