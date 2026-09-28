# Deployment

Nomad Compass supports two deployment targets from the same codebase:

| Target | Best for | Latency | Infrastructure |
|--------|----------|---------|----------------|
| Cloudflare Workers | Global access, edge performance | Low (edge) | Serverless |
| Docker | Self-hosted, on-premise, air-gapped | Depends on location | Container |

## Cloudflare Workers

Your app runs on Cloudflare's network close to users. Cloudflare must be able
to reach your Nomad API: give it a public HTTPS address, for example through
a Cloudflare Tunnel, and keep Nomad ACLs on.

**Prerequisites:**

- Cloudflare account.
- Wrangler CLI (`bun add -g wrangler`).

**Setup:**

```bash
# Login to Cloudflare
wrangler login

# Set Nomad server address as a secret
wrangler secret put NOMAD_ADDR
# Enter: https://your-nomad-server.example.com

# Set the ticket secret
wrangler secret put TICKET_SECRET
# Enter the output of: openssl rand -hex 32

# Deploy
bun run deploy:cf
```

Your app will be available at
`https://nomad-compass.<your-subdomain>.workers.dev`.

A custom domain is an optional `wrangler.toml` addition:

```toml
routes = [
  { pattern = "nomad.example.com", custom_domain = true }
]
```

With the repository connected to Workers Builds, other branches deploy as
Previews (`wrangler preview`). Previews do not inherit the Worker's secrets:
set them once in the Preview base config, and use a different
`TICKET_SECRET` than production:

```bash
wrangler preview base-config secret put NOMAD_ADDR
wrangler preview base-config secret put TICKET_SECRET
```

Preview URLs are public; Cloudflare Access can require sign-in for them.

## Docker

For self-hosted, on-premise, or air-gapped environments.

A release tag (`v*.*.*`) builds a multi-arch image (amd64, arm64) and pushes
it to `ghcr.io/ingvarch/nomad-compass` as the version tag and as `latest`.

**Run the published image:**

```bash
docker run -d \
  --name nomad-compass \
  -p 3000:3000 \
  -e NOMAD_ADDR=http://your-nomad-server:4646 \
  -e TICKET_SECRET=your-generated-secret \
  ghcr.io/ingvarch/nomad-compass:latest
```

**Build it yourself:**

```bash
bun run docker:build
# or directly with Docker
docker build -t nomad-compass .
```

**Docker Compose:**

```yaml
services:
  nomad-compass:
    image: ghcr.io/ingvarch/nomad-compass:latest
    # or build from source: build: .
    ports:
      - "3000:3000"
    environment:
      - NOMAD_ADDR=http://nomad:4646
      - TICKET_SECRET=your-generated-secret
    restart: unless-stopped
```

## Behind a reverse proxy

Terminate TLS at the proxy. Nomad Compass reads `X-Forwarded-Proto` to mark
its cookies `Secure` and to send HSTS, and `X-Real-IP` or `X-Forwarded-For`
for rate limits. Traefik sets these headers by default.

```yaml
services:
  nomad-compass:
    image: ghcr.io/ingvarch/nomad-compass:latest
    environment:
      - NOMAD_ADDR=http://nomad:4646
      - TICKET_SECRET=your-generated-secret
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.nomad-compass.rule=Host(`nomad.example.com`)"
      - "traefik.http.services.nomad-compass.loadbalancer.server.port=3000"
```

The guides in [traefik/](traefik/) set up Traefik as ingress for Nomad jobs,
together with the ingress options of the job form.
