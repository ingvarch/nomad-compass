# Nomad Compass

A modern, lightweight web UI for managing HashiCorp Nomad clusters. Built with Hono + React 19 + Vite, deployable to Cloudflare Workers or Docker.

## Features

- **Job Management**: Create, edit, monitor, and delete jobs
- **Container Configuration**: Configure Docker/Podman containers with ease
- **Environment Variables**: Manage environment variables with sorting
- **Network Configuration**: Configure service networking and port mappings
- **Service Health Checks**: Set up and monitor service health checks
- **Log Viewing**: View and filter logs for running containers
- **Multi-Namespace Support**: Work with multiple Nomad namespaces
- **Dark Mode**: Full dark mode support

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/) - Fast JavaScript runtime, package manager, and bundler
- **API**: [Hono](https://hono.dev/) - Lightweight, ultrafast web framework
- **Frontend**: React 19 + React Router 7 + Tailwind CSS
- **Build**: Vite (frontend) + Bun bundler (backend)
- **Deploy**: Cloudflare Workers or Docker (Bun)

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) 1.0+
- A running Nomad cluster
- Nomad ACL token

### Installation

1. Clone the repository:

```bash
git clone https://github.com/ingvarch/nomad-compass.git
cd nomad-compass
```

2. Install dependencies:

```bash
bun install
```

3. Start the development server:

```bash
bun run dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

### Authentication

On first access, you'll be prompted to enter your Nomad server address and ACL token.

### Managing Jobs

1. **View Jobs**: The jobs page shows all jobs across namespaces or within a selected namespace
2. **Job Details**: Click on a job to view details, configurations, and task groups
3. **Create Jobs**: Use the "Create Job" button to launch the job creation form
4. **Edit Jobs**: Modify job configurations through the edit interface
5. **Manage Tasks**: Configure resources, environment variables, and networking per task

### Viewing Logs

Job detail pages include a logs section that allows:

- Selecting specific allocations and tasks
- Switching between stdout and stderr
- Auto-refreshing logs
- Manual refresh

## Deployment

Nomad Compass supports two deployment targets from the same codebase:

| Target | Best For | Latency | Infrastructure |
|--------|----------|---------|----------------|
| Cloudflare Workers | Global access, edge performance | Low (edge) | Serverless |
| Docker | Self-hosted, on-premise, air-gapped | Depends on location | Container |

### Cloudflare Workers

Recommended for global edge performance. Your app runs on Cloudflare's network close to users.

**Prerequisites:**
- Cloudflare account
- Wrangler CLI (`bun add -g wrangler`)

**Setup:**

```bash
# Login to Cloudflare
wrangler login

# Set Nomad server address as a secret
wrangler secret put NOMAD_ADDR
# Enter: https://your-nomad-server.example.com

# Deploy
bun run deploy:cf
```

Your app will be available at `https://nomad-compass.<your-subdomain>.workers.dev`

**Custom domain (optional):**

Add to `wrangler.toml`:
```toml
routes = [
  { pattern = "nomad.example.com", custom_domain = true }
]
```

### Docker

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
    restart: unless-stopped
```

**With reverse proxy (Traefik example):**

```yaml
services:
  nomad-compass:
    build: .
    environment:
      - NOMAD_ADDR=http://nomad:4646
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.nomad-compass.rule=Host(`nomad.example.com`)"
      - "traefik.http.services.nomad-compass.loadbalancer.server.port=3000"
```

### Environment Variables

| Variable | Description | Default | Used In |
|----------|-------------|---------|---------|
| `NOMAD_ADDR` | Nomad server address | `http://localhost:4646` | Both |
| `PORT` | Server port | `3000` | Docker only |

## Development

Two development modes are available, matching the two deployment targets:

### Cloudflare Workers Development

Uses Wrangler to emulate the Cloudflare Workers environment locally.

```bash
bun run dev          # Vite (frontend) + Wrangler (API)
```

Configure your Nomad server in `.dev.vars`:

```bash
echo 'NOMAD_ADDR=http://localhost:4646' > .dev.vars
```

### Bun Development

Uses the Bun backend directly, useful for Docker deployment testing.

```bash
bun run dev:bun      # Vite (frontend) + Bun API server
```

Set your Nomad server via environment variable:

```bash
NOMAD_ADDR=http://localhost:4646 bun run dev:bun
```

### Other Commands

```bash
bun run dev:vite     # Vite only (no backend)
bun run dev:worker   # Wrangler only (no frontend dev)
bun run dev:api      # Bun API only

bun run build        # Build frontend
bun run build:bun    # Build Bun server
bun run build:all    # Build both

bun run lint         # Run ESLint
bun run typecheck    # Run TypeScript type checking
```

### Project Structure

```
src/
├── api/              # Hono API layer
│   ├── app.ts        # App factory
│   ├── routes/       # API routes
│   └── middleware/   # Auth middleware
├── client/           # React SPA
│   ├── pages/        # Page components
│   ├── components/   # Reusable components
│   ├── hooks/        # Custom hooks
│   ├── lib/          # Utilities and API client
│   └── context/      # React contexts
├── entry.cloudflare.ts  # Cloudflare Workers entry
├── entry.bun.ts         # Bun production entry
└── entry.bun.dev.ts     # Bun dev entry (API only)
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
