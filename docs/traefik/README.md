# Traefik Documentation

Guides for setting up Traefik reverse proxy with Nomad and Nomad Compass.

## Guides

| Guide | Description |
|-------|-------------|
| [00-basic-setup.md](./00-basic-setup.md) | Basic Traefik installation and Nomad integration |
| [01-cloudflare-dns-challenge.md](./01-cloudflare-dns-challenge.md) | Automatic SSL with Cloudflare DNS Challenge |

## Quick Start

1. Follow [00-basic-setup.md](./00-basic-setup.md) to install Traefik
2. If using Cloudflare, follow [01-cloudflare-dns-challenge.md](./01-cloudflare-dns-challenge.md) for DNS Challenge setup
3. Create jobs in Nomad Compass with "Service Discovery & Ingress" enabled
