# Kiban Roadmap

The roadmap describes the evolution of Kiban.

It is intentionally incremental.

Every milestone leaves the project in a releasable state.

---

# Phase 0 — Foundation

## Completed

- Repository structure
- CI/CD pipeline
- Authentication
- Users
- Projects
- Environments
- Clean Architecture backend (NestJS + Fastify)
- Angular frontend with TailwindCSS
- SQLite with Drizzle ORM
- Plugin-style catalog system

---

# Phase 1 — Infrastructure Platform

## Completed

### Service Catalog

127 services across 30 categories:

- **Databases** (20): PostgreSQL, MySQL, MariaDB, Redis, Valkey, MongoDB, ClickHouse, Elasticsearch, InfluxDB, Neo4j, and 10 more
- **AI** (12): Ollama, Open WebUI, LiteLLM, Flowise, Langflow, and 7 more
- **Productivity** (11): Nextcloud, Vaultwarden, Odoo, ERPNext, and 7 more
- **Monitoring** (9): Grafana, Prometheus, Loki, Tempo, Uptime Kuma, and 4 more
- **CMS** (7): WordPress, Strapi, Ghost, Directus, and 3 more
- **Observability** (7): Jaeger, Kibana, OpenObserve, SigNoz, and 3 more
- **Security** (7): Vault, Infisical, Passbolt, and 4 more
- **Messaging** (4): RabbitMQ, Kafka, NATS, Mosquitto
- **Automation** (4): n8n, Activepieces, Temporal, Windmill
- **And 17 more categories**: Analytics, Authentication, Backend Platforms, Browsers, DevOps, Email, File Management, Git, Home, Media, Networking, Passwords, Search, Self-Hosted, Storage, Web Servers, Backup, Misc

### Runtime

- Docker Compose Runtime Provider
- RuntimeProvider interface abstraction
- Service lifecycle: install, start, stop, restart, delete
- Automatic port assignment (avoids collisions)
- Environment-isolated Docker networks
- Safe `.env` generation from catalog schemas
- Compose workspace management

### Reverse Proxy

- Default Traefik reverse proxy
- Shared `kiban` network
- Automatic local URLs for HTTP services (`{service}.{environment}.{project}.localhost`)
- Traefik label injection without modifying catalog compose templates
- Configurable base domains
- Instance Domain for dashboard access
- Wildcard Domain for service URLs
- Per-service domain override
- Domain routing documentation ([`docs/domain.md`](./domain.md))

### Terminal

- Interactive terminal for installed service containers
- Docker Engine API integration (Unix socket)
- Socket.IO WebSocket gateway
- Session management with timeouts
- Multi-container selection per service

### Logs

- Service logs per installed service (container selector, auto-refresh, copy, clear)
- Kiban platform logs (core runtime: `kiban-api`, `kiban-web`)
- Health check display (Docker Health authoritative, public URL diagnostic-only)

### Web UI

- Project management (CRUD)
- Environment management
- Service catalog browsing and search
- Installed service details (configuration, access points, credentials, terminal, logs)
- Danger zone (recreate, delete)
- Dark theme
- Responsive layout

### Health

- Docker Health as authoritative signal
- `docker inspect` fallback when `compose ps` omits health
- Public endpoint checks as diagnostic-only (never degrade healthy to unhealthy)

---

# Phase 2 — First Public Release

The first public release.

### Goals

- POSIX shell CLI (`~/.kiban/bin/kiban`)
  - `version`, `doctor`, `status`, `start`, `stop`, `restart`, `logs`
  - Zero dependencies beyond Docker
  - POSIX-compatible (Linux + macOS)
- Installer improvements
  - GHCR image pull (replace local build)
  - `curl -fsSL https://get.kibanos.com | sh`
- GitHub release
- GHCR image publishing (`ghcr.io/kiryokulabs/kiban-api`, `ghcr.io/kiryokulabs/kiban-web`)
- Cloudflare DNS + Worker for `get.kibanos.com`

---

# Phase 3 — Variables & Secrets

- Project-level variables
- Environment-level variables
- Secret management (encrypted at rest)
- Variable interpolation in service configuration
- Secret injection into compose `.env` files

---

# Phase 4 — Custom Domains & HTTPS

- Custom domain configuration per service
- Automatic SSL/TLS via Let's Encrypt
- DNS challenge support
- Wildcard certificate support
- Domain verification

---

# Phase 5 — Backups

- Volume backup and restore
- Scheduled backups
- Backup to local filesystem
- Backup to S3-compatible storage
- Restore from backup

---

# Phase 6 — Notifications

- Email notifications
- Webhook notifications
- Slack/Discord integration
- Service health change alerts
- Backup status alerts

---

# Phase 7 — Applications

Application management as first-class resources.

Supported runtimes:

- Node.js
- Bun
- Deno
- PHP
- Ruby
- Python
- Go
- Java

Features:

- Source code from local filesystem
- Build and deploy
- Environment variables
- Custom domains

---

# Phase 8 — Git Integration

Providers:

- GitHub
- GitLab
- Forgejo
- Gitea

Features:

- Clone
- Build
- Deploy
- Rollback
- Webhooks
- Automatic deployments on push

---

# Phase 9 — Plugins

- Plugin SDK
- Plugin API
- Plugin Marketplace

Example plugins:

- Cloudflare (DNS management)
- AWS (ECS, RDS)
- Azure (Container Apps)
- Terraform
- Slack
- Discord

---

# Long-Term Vision

Kiban should become the operating system for self-hosted infrastructure.

A single platform capable of managing:

- Infrastructure
- Applications
- Deployments
- Domains
- SSL
- Secrets
- Backups
- Monitoring
- Teams
- Plugins

without vendor lock-in.

---

# Non-Goals

Kiban is not intended to become:

- A cloud provider
- A managed hosting platform
- A Kubernetes distribution

Its purpose is to simplify self-hosted infrastructure while remaining transparent, extensible, and fully open-source.
