# Deployment

Nomad Compass supports two deployment targets from the same codebase:

| Target | Best for | Latency | Infrastructure |
|--------|----------|---------|----------------|
| Cloudflare Workers | Global access, edge performance | Low (edge) | Serverless |
| Docker | Self-hosted, on-premise, air-gapped | Depends on location | Container |

## Cloudflare Workers

Recommended for global edge performance. Your app runs on Cloudflare's
network close to users.

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
`https://nomad-compass.<your-subdomain>.workers.dev`. A secret is set with
`wrangler secret put` in the Workers deploy steps — see
[Configuration](configuration.md) for the full list.

## Docker

For self-hosted, on-premise, or air-gapped environments.

**Build and run:**

```bash
# Build the image
bun run docker:build
# or directly with Docker
docker build -t nomad-compass .

# Run
docker run -d \
  --name nomad-compass \
  -p 3000:3000 \
  -e NOMAD_ADDR=http://your-nomad-server:4646 \
  -e TICKET_SECRET=your-generated-secret \
  nomad-compass
```

**Docker Compose:**

```yaml
services:
  nomad-compass:
    build: .
    # or use pre-built: image: ghcr.io/ingvarch/nomad-compass:latest
    ports:
      - "3000:3000"
    environment:
      - NOMAD_ADDR=http://nomad:4646
      - TICKET_SECRET=your-generated-secret
    restart: unless-stopped
```

A release tag (`v*.*.*`) builds and pushes a multi-arch image to
`ghcr.io/ingvarch/nomad-compass:<tag>`.

**With reverse proxy (Traefik example):**

```yaml
services:
  nomad-compass:
    build: .
    environment:
      - NOMAD_ADDR=http://nomad:4646
      - TICKET_SECRET=your-generated-secret
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.nomad-compass.rule=Host(`nomad.example.com`)"
      - "traefik.http.services.nomad-compass.loadbalancer.server.port=3000"
```

Step-by-step Traefik guides live in [traefik/](traefik/).
