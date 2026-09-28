# Deployment

ovoo supports two deployment targets from the same codebase:

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
`https://ovoo.<your-subdomain>.workers.dev`.

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
it to `ghcr.io/ingvarch/ovoo` as the version tag and as `latest`. Any `v*`
tag also creates a GitHub Release with auto-generated notes.

**Run the published image:**

```bash
docker run -d \
  --name ovoo \
  -p 3000:3000 \
  -e NOMAD_ADDR=http://your-nomad-server:4646 \
  -e TICKET_SECRET=your-generated-secret \
  ghcr.io/ingvarch/ovoo:latest
```

**Build it yourself:**

```bash
bun run docker:build
# or directly with Docker
docker build -t ovoo .
```

**Docker Compose:**

```yaml
services:
  ovoo:
    image: ghcr.io/ingvarch/ovoo:latest
    # or build from source: build: .
    ports:
      - "3000:3000"
    environment:
      - NOMAD_ADDR=http://nomad:4646
      - TICKET_SECRET=your-generated-secret
    restart: unless-stopped
```

## Behind a reverse proxy

Terminate TLS at the proxy. ovoo reads `X-Forwarded-Proto` to mark
its cookies `Secure` and to send HSTS, and `X-Real-IP` or `X-Forwarded-For`
for rate limits. Traefik sets these headers by default.

```yaml
services:
  ovoo:
    image: ghcr.io/ingvarch/ovoo:latest
    environment:
      - NOMAD_ADDR=http://nomad:4646
      - TICKET_SECRET=your-generated-secret
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.ovoo.rule=Host(`nomad.example.com`)"
      - "traefik.http.services.ovoo.loadbalancer.server.port=3000"
```

Launch pages of periodic jobs and their API calls have `%2F` in the path
(`/jobs/backup%2Fperiodic-1790611797`); the proxy must pass it unchanged.
Traefik v3.6.4 to v3.6.6 and v2.11.32 to v2.11.34 reject it by default.
Upgrade to Traefik v3.6.7 or later, or v2.11.35 or later: they allow encoded
slashes by default again. On v3.6.4, v3.6.6 and v2.11.32 to v2.11.34 you can
instead set `entryPoints.<name>.http.encodedCharacters.allowEncodedSlash=true`.
v3.6.5 ignores that option ([traefik/traefik#12437][traefik-12437]), so
upgrade from it. In nginx, give `proxy_pass` no URI part
(`proxy_pass http://ovoo:3000;`): with a URI part, even `/`, nginx forwards
the decoded path.

[traefik-12437]: https://github.com/traefik/traefik/issues/12437

The guides in [traefik/](traefik/) set up Traefik as ingress for Nomad jobs,
together with the ingress options of the job form.
