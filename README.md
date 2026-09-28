<div align="center">

# Nomad Compass

**A web UI for HashiCorp Nomad that runs on Cloudflare Workers or in Docker.**

[![release](https://img.shields.io/github/v/release/ingvarch/nomad-compass)](https://github.com/ingvarch/nomad-compass/releases/latest)
[![license](https://img.shields.io/github/license/ingvarch/nomad-compass)](LICENSE)

![Nomad Compass dashboard](docs/images/dashboard.png)

</div>

## What it does

- Shows cluster health, resource usage, stability alerts and recent activity
  on one dashboard.
- Creates, edits, clones and deletes jobs: containers, resources, environment
  variables, ports, service health checks, private registries and Traefik
  ingress tags.
- Shows the plan diff before a job is submitted, and reverts a job to any
  earlier version.
- Streams task logs with stdout/stderr filtering.
- Opens a terminal in a running task. The ACL token stays in an `httpOnly`
  cookie and never appears in a URL.
- Lists allocations, failed allocations, nodes, servers and the cluster
  topology.
- Manages ACL policies (visual or HCL editor), roles and tokens, and creates
  and deletes namespaces.
- Has light, dark and system themes.

![Remote exec in the browser](docs/images/exec.png)

## Quick start

With Docker, point the published image at your Nomad API:

```sh
docker run -p 3000:3000 \
  -e NOMAD_ADDR=http://your-nomad:4646 \
  -e TICKET_SECRET=$(openssl rand -hex 32) \
  ghcr.io/ingvarch/nomad-compass:latest
```

Open [http://localhost:3000](http://localhost:3000) and paste your ACL token.

From source, you need [Bun](https://bun.sh/) 1.2+:

```sh
git clone https://github.com/ingvarch/nomad-compass.git
cd nomad-compass
bun install
cp .dev.vars.example .dev.vars
```

In `.dev.vars`, set `NOMAD_ADDR` to your Nomad API and `TICKET_SECRET` to the
output of `openssl rand -hex 32`. Then run `bun run dev`, open
[http://localhost:5173](http://localhost:5173) and paste your ACL token.

## Documentation

- [Usage](docs/usage.md): signing in, jobs, logs, remote exec, namespaces.
- [Configuration](docs/configuration.md): environment variables, the ticket
  secret and local `.dev.vars`.
- [Deployment](docs/deployment.md): Cloudflare Workers, Docker, Compose,
  running behind a reverse proxy, release images.
- [Development](docs/development.md): dev modes, commands, project structure
  and tech stack.
- [Security](docs/security.md): cookies, CSRF, rate limits, signed WebSocket
  tickets.
- [Traefik guides](docs/traefik/): Traefik as ingress for Nomad jobs, with
  the ingress options of the job form.

## Contributing

How to build Nomad Compass, run the checks and send a change is in
[CONTRIBUTING.md](CONTRIBUTING.md). Security problems are reported privately,
see [SECURITY.md](SECURITY.md).

## License

MIT, see [LICENSE](LICENSE).
