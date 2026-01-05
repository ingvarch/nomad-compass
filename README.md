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

- **API**: [Hono](https://hono.dev/) - Lightweight, ultrafast web framework
- **Frontend**: React 19 + React Router 7 + Tailwind CSS
- **Build**: Vite (frontend) + tsup (Node.js backend)
- **Deploy**: Cloudflare Workers or Docker (Node.js)

## Getting Started

### Prerequisites

- Node.js 22+ or pnpm 10+
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
pnpm install
```

3. Start the development server:

```bash
pnpm run dev
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

### Cloudflare Workers

The recommended deployment method for global edge performance.

```bash
# Deploy to Cloudflare Workers
pnpm run deploy:cf
```

Configure your Nomad server address:

```bash
# Set as secret (recommended for production)
wrangler secret put NOMAD_ADDR
# Enter: https://your-nomad-server.example.com

# Or for local development, create .dev.vars file:
echo 'NOMAD_ADDR=https://your-nomad-server.example.com' > .dev.vars
```

### Docker

For self-hosted or on-premise deployments.

```bash
# Build the Docker image
pnpm run docker:build
# or
docker build -t nomad-compass .

# Run the container
docker run -p 3000:3000 -e NOMAD_ADDR=http://your-nomad-server:4646 nomad-compass
```

### Docker Compose

```yaml
services:
  nomad-compass:
    image: nomad-compass
    ports:
      - "3000:3000"
    environment:
      - NOMAD_ADDR=http://nomad:4646
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NOMAD_ADDR` | Nomad server address | `http://localhost:4646` |
| `PORT` | Server port (Docker only) | `3000` |

## Development

Two development modes are available, matching the two deployment targets:

### Cloudflare Workers Development

Uses Wrangler to emulate the Cloudflare Workers environment locally.

```bash
pnpm run dev          # Vite (frontend) + Wrangler (API)
```

Configure your Nomad server in `.dev.vars`:

```bash
echo 'NOMAD_ADDR=http://localhost:4646' > .dev.vars
```

### Node.js Development

Uses the Node.js backend directly, useful for Docker deployment testing.

```bash
pnpm run dev:node     # Vite (frontend) + Node.js API server
```

Set your Nomad server via environment variable:

```bash
NOMAD_ADDR=http://localhost:4646 pnpm run dev:node
```

### Other Commands

```bash
pnpm run dev:vite     # Vite only (no backend)
pnpm run dev:worker   # Wrangler only (no frontend dev)
pnpm run dev:api      # Node.js API only

pnpm run build        # Build frontend
pnpm run build:node   # Build Node.js server
pnpm run build:all    # Build both

pnpm run lint         # Run ESLint
pnpm run typecheck    # Run TypeScript type checking
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
├── entry.node.ts        # Node.js production entry
└── entry.node.dev.ts    # Node.js dev entry (API only)
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
