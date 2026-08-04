# Kiban Roadmap

The roadmap describes the planned evolution of Kiban.

It is intentionally incremental.

Every milestone should leave the project in a releasable state.

---

# Phase 0

Foundation

## Completed

- Repository
- CI/CD
- Authentication
- Users
- Projects
- Environments

---

# Phase 1

Infrastructure Foundation

## Goals

- Service Catalog
- Installed Services
- Runtime abstraction
- Docker Compose Runtime Provider
- Service lifecycle
- Default Traefik reverse proxy
- Automatic local URLs for HTTP services

Supported services:

- PostgreSQL
- MySQL
- MariaDB
- Redis
- Valkey
- MongoDB
- ClickHouse
- MinIO
- Nginx
- Traefik
- Caddy

---

# Phase 2

Infrastructure Expansion

Additional services:

Messaging

- RabbitMQ
- Kafka
- NATS
- Mosquitto

Monitoring

- Grafana
- Prometheus
- Loki
- Tempo

Automation

- n8n
- Activepieces

AI

- Ollama
- Open WebUI
- LiteLLM
- Flowise
- Langflow

Analytics

- Umami
- Plausible
- Matomo

Authentication

- Authentik
- Keycloak

Storage

- SeaweedFS

Backend Platforms

- Supabase

---

# Phase 3

Docker Compose Runtime Hardening

Features

- Compose workspace management
- Compose project naming
- Container lifecycle through RuntimeProvider
- Logs through Compose
- Status through Compose ps
- Volumes through Compose down/up semantics
- Health/status mapping
- Safer .env generation
- Automatic host port assignment when preferred catalog ports are unavailable
- Shared Traefik network for proxied HTTP services
- Generated Traefik labels without modifying catalog compose templates

---

# Phase 4

Platform

Features

- Variables
- Secrets
- Custom domains
- Managed HTTPS
- Logs
- Backups
- Monitoring
- Notifications

---

# Phase 5

Applications

Application management

Supported runtimes:

- Node.js
- Bun
- Deno
- PHP
- Ruby
- Python
- Go
- Java

Applications become first-class resources.

---

# Phase 6

Git Integration

Providers

- GitHub
- GitLab
- Forgejo
- Gitea

Features

- Clone
- Build
- Deploy
- Rollback
- Webhooks

---

# Phase 7

Plugins

Plugin SDK

Plugin API

Plugin Marketplace

Example plugins:

- Cloudflare
- AWS
- Azure
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
