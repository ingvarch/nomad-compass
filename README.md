<div align="center">

# Nomad Compass

**A web UI for HashiCorp Nomad.**
Hono API plus React frontend, deployable to Cloudflare Workers or Docker.

[![release](https://img.shields.io/github/v/release/ingvarch/nomad-compass)](https://github.com/ingvarch/nomad-compass/releases/latest)
[![license](https://img.shields.io/github/license/ingvarch/nomad-compass)](LICENSE)

</div>

## What it does

- Creates, edits, monitors and deletes jobs across namespaces.
- Configures Docker/Podman containers: resources, environment variables,
  networking, port mappings and service health checks.
- Streams task logs with stdout/stderr filtering.
- Opens a terminal in a running container over a secure WebSocket relay —
  the ACL token never leaves the `httpOnly` cookie.
- Switches namespaces, follows allocations, tasks, nodes and servers.
- Works in a full dark mode.

## Quick start

You need [Bun](https://bun.sh/) 1.0+, a running Nomad cluster and an ACL
token:

```sh
git clone https://github.com/ingvarch/nomad-compass.git
cd nomad-compass
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173), enter the Nomad address
and the token when asked. For the ticket secret and the Bun backend mode,
see [Configuration](docs/configuration.md).

## Documentation

- [Usage](docs/usage.md): authentication, jobs, logs, remote exec,
  namespaces.
- [Configuration](docs/configuration.md): environment variables, the ticket
  secret, local `.dev.vars` and Wrangler secrets.
- [Deployment](docs/deployment.md): Cloudflare Workers versus Docker,
  Compose, reverse proxy and release images.
- [Development](docs/development.md): dev modes, commands, project structure
  and tech stack.
- [Security](docs/security.md): cookies, signed WebSocket tickets and the
  relay diagram.
- [Traefik guides](docs/traefik/): reverse-proxy setup with Nomad Compass.

## Contributing

How to build Nomad Compass, run the checks and send a change is in
[CONTRIBUTING.md](CONTRIBUTING.md). Security problems are reported privately,
see [SECURITY.md](SECURITY.md).

## License

MIT, see [LICENSE](LICENSE).
