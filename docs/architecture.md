# Kiban Architecture

## Philosophy

Kiban is an open-source infrastructure platform.

Its goal is to make self-hosting infrastructure as simple as possible while remaining fully local and transparent.

Kiban does **not** own your infrastructure.

Kiban orchestrates it.

The project is designed around the following principles:

- Infrastructure first
- Local-first
- Self-hosted
- Docker as the first runtime
- Runtime agnostic
- Zero vendor lock-in
- Zero-code extensibility
- API-first
- Test-first
- Open-source forever

---

# High Level Architecture

```
┌───────────────────────────────┐
│          Angular UI           │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│          NestJS API           │
└──────────────┬────────────────┘
               │
        Application Layer
               │
               ▼
      Domain / Business Logic
               │
               ▼
 Infrastructure Layer
               │
               ▼
Docker (future Podman, Kubernetes...)
```

---

# Core Concepts

Everything in Kiban is built around a small set of domain concepts.

```
Project
    │
    ├── Environment
    │       │
    │       ├── Installed Services
    │       │
    │       └── Applications (future)
    │
    └── Variables (future)
```

---

# Projects

Projects group related infrastructure.

Examples:

- CrossMetrics
- Personal Website
- CRM
- AI Playground

Projects contain one or more environments.

---

# Environments

Every project contains environments.

By default:

- Development
- Staging
- Production

Users may create additional environments.

Examples:

- Demo
- Testing
- Customer A

Environments are isolated.

---

# Service Catalog

The Service Catalog is read-only.

It is stored inside the repository.

It is never stored inside the database.

Each service contains:

```
service/

    metadata.json
    compose.yaml
    schema.json
    icon.svg
```

---

# Installed Services

Installed Services belong to environments.

Examples:

Development

- PostgreSQL
- Redis
- MinIO

Production

- PostgreSQL
- Redis

Installed Services are mutable.

Service Definitions are immutable.

---

# Runtime

Kiban does not depend directly on Docker.

Docker is the first Runtime Provider.

Future runtimes may include:

- Docker
- Podman
- Kubernetes
- Nomad

Application code must never reference Docker directly.

---

# Zero-Code Extensibility

Adding a new service must never require changing TypeScript code.

The only required action should be:

```
catalog/

    databases/

        cockroachdb/
```

After restarting Kiban, the service should automatically appear.

No registrations.

No switch statements.

No hardcoded arrays.

---

# Clean Architecture

Dependencies always point inward.

```
UI

↓

Application

↓

Domain

↓

Infrastructure
```

Business logic must never depend on infrastructure.

---

# Runtime Providers

Every runtime implements the same interface.

```
RuntimeProvider

install()

uninstall()

start()

stop()

restart()

health()
```

The application layer only depends on this abstraction.

---

# Current Scope

Current version focuses on:

- Authentication
- Users
- Projects
- Environments
- Service Catalog
- Installed Services

Everything else belongs to future milestones.

---

# Future

Future modules include:

- Applications
- Git
- CI/CD
- Domains
- SSL
- Secrets
- Backups
- Monitoring
- Teams
- Plugins

These modules must integrate with the existing architecture without requiring breaking changes.
