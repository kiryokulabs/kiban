# Domain Routing

Kiban owns HTTP routing for the dashboard and all installed services.

This document explains how domains are generated, when they work, and how to configure them.

---

# Overview

Kiban has two domain concepts:

| Domain | Purpose | Example |
|---|---|---|
| **Instance Domain** | Access the Kiban dashboard without port 8080 | `kiban.example.com` |
| **Wildcard Domain** | Default base domain for installed service URLs | `services.example.com` |

Each installed service can also have a **custom domain override** that replaces the generated default.

All domain routing is managed through Traefik, the built-in reverse proxy.

## Remote Access Rule

Kiban itself must always be reachable directly through its installation address:

```txt
http://your-server-ip:8080
```

This is required for first-time setup and recovery. Without this direct dashboard access, the user would have no way to configure domains from Settings.

Domains are different for dashboard access and service access:

- **Dashboard access:** an Instance Domain is optional. It adds a nicer hostname for Kiban, but it must not replace `IP:8080`.
- **Remote service access:** a Wildcard Domain with DNS is required if services need to be opened from other machines or from the internet.

Without a Wildcard Domain, service URLs fall back to `.localhost`. That is useful for local installations, but it does not work from another computer, phone, VPS client, or remote browser.

---

# Domain Format

Service domains follow a fixed pattern:

```
{service}.{environment}.{project}.{base-domain}
```

Examples with Wildcard Domain `services.example.com`:

```txt
grafana.development.crossmetrics.services.example.com
n8n.production.myproject.services.example.com
postgresql.staging.crm.services.example.com
```

Examples with no Wildcard Domain (default `localhost`):

```txt
grafana.development.crossmetrics.localhost
n8n.production.myproject.localhost
```

The slugification rules:

- Lowercase
- Accents removed (NFKD normalization)
- Non-alphanumeric characters replaced with `-`
- Leading/trailing `-` removed

---

# Instance Domain

The Instance Domain adds a hostname for dashboard access without requiring users to type `IP:8080`.

## Configuration

Navigate to **Settings** and enter a hostname in the Instance Domain field.

```
kiban.example.com
```

## DNS Required

```
A   kiban.example.com   →   your server IP
```

## What Happens

When saved, Kiban:

1. Adds Traefik labels to the `kiban-web` container in the core compose file.
2. Runs `docker compose up -d --force-recreate` on the core stack.
3. Traefik starts routing `kiban.example.com` to the dashboard.

## Behavior

- The dashboard remains accessible at `IP:8080` until that port is closed manually.
- Clearing the Instance Domain removes the Traefik labels and stops routing through that hostname.
- The Instance Domain only affects the Kiban dashboard, not installed services.
- `IP:8080` remains available as a direct dashboard fallback unless the installed runtime is changed manually.

---

# Wildcard Domain

The Wildcard Domain is the default base domain for all installed services.

For remote installations, this is the important domain. If users want service URLs to work outside the machine running Kiban, they need a real Wildcard Domain and a DNS record pointing to the server.

## Configuration

Navigate to **Settings** and enter a hostname in the Services Wildcard Domain field.

```
services.example.com
```

This can be any domain or subdomain you control. `services.example.com` is only an example. You could use `apps.example.com`, `tools.example.com`, `internal.company.com`, or even `example.com` if you want service URLs directly under that base domain.

## DNS Required

```
A   *.services.example.com   →   your server IP
```

## What Happens

When a new service is installed, `DomainService` generates its URL:

```txt
n8n.development.crossmetrics.services.example.com
```

Traefik routes this hostname to the service container through the shared `kiban` Docker network.

## Behavior

- The Wildcard Domain only affects **newly installed** services.
- Existing services keep their current domain until manually changed.
- Changing the Wildcard Domain does not retroactively update existing services.
- Clearing the Wildcard Domain makes newly installed services fall back to `.localhost` domains.
- On remote servers, `.localhost` fallback URLs are not useful for service access from other machines.

---

# Why Services Do Not Use `IP:8080/service`

Kiban intentionally keeps the dashboard and installed services separated.

The dashboard is available at:

```txt
http://your-server-ip:8080
```

Installed services are exposed through hostnames:

```txt
http://grafana.development.myapp.services.example.com
```

Kiban does **not** expose services as:

```txt
http://your-server-ip:8080/grafana
```

This is deliberate. Many services assume they are running at the root path `/`. Running them under a subpath can break:

- Static assets such as `/assets/app.js`
- Redirects such as `/login`
- Cookies scoped to `/`
- WebSocket connections
- APIs that generate absolute URLs

Hostname-based routing is more predictable, works better with third-party services, and keeps the Kiban dashboard independent from installed service traffic.

---

# Per-Service Domain Override

Every installed service can have its own custom domain, overriding the generated default.

## Configuration

Open the service detail page. The **Service domain** section shows the current hostname.

```
n8n.development.crossmetrics.services.example.com
```

Change it to a custom hostname:

```txt
n8n.example.com
```

## What Happens

When saved, Kiban:

1. Updates `runtime.publicEndpoints` in the service's database record.
2. Rewrites Traefik labels in the service's `compose.yaml`.
3. Runs `docker compose up -d --force-recreate` on the service.
4. **Does not** run `down -v`, so persistent data is preserved.

## Behavior

- The override is independent of the Wildcard Domain.
- If the Wildcard Domain changes later, services with overrides keep their custom domain.
- Services without an override keep the domain assigned at install time.
- Recreating a service or saving its configuration preserves the currently assigned public domain.

---

# Localhost Behavior

`.localhost` is reserved by RFC 6761 for loopback resolution.

| Scenario | `.localhost` works? |
|---|---|
| Kiban running on your own machine | Yes |
| Kiban on a remote VPS | No |
| Kiban accessed through a tunnel | No |

When no Wildcard Domain is configured, Kiban defaults to:

```txt
{service}.{environment}.{project}.localhost
```

This works **only** when the browser is on the same machine running Kiban.

---

# Remote Servers and Tunnels

When Kiban is installed on a VPS or accessed through a tunnel (Cloudflare Tunnel, ngrok, etc.), a real domain with DNS records is required.

## Remote VPS

1. Configure a Wildcard Domain in Settings.
2. Create a DNS record:

```txt
A   *.services.example.com   →   your VPS IP
```

3. All installed services will be accessible at their generated URLs.

## Tunnels

If you use a tunnel provider with wildcard DNS (e.g., `*.trycloudflare.com`):

1. Configure a Wildcard Domain matching your tunnel's hostname pattern.
2. The tunnel automatically routes all generated service URLs.

If your tunnel uses individual routes, you would need to add a route per service. This is why Wildcard Domain + wildcard DNS is recommended.

---

# Development Mode

When running Kiban in development mode:

```bash
pnpm start
```

The API runs on `localhost:3000` and the Angular dev server on `localhost:4200`.

In this mode:

- There is no `kiban-web` container managed by Kiban.
- There is no Traefik reverse proxy managed by Kiban.
- Domain routing settings have no effect.
- Access services directly through their published host ports.

Domain routing is designed for the **installed runtime** (Docker-installed Kiban), not for local development.

---

# Traefik Integration

Kiban uses Traefik v3.6 as the default reverse proxy.

## Architecture

```
Browser
  ↓
Traefik (ports 80, 443)
  ↓ (shared kiban network)
Service containers
```

## How Labels Work

When a service is installed or its domain is updated, Kiban writes Traefik labels into the generated `compose.yaml`:

```yaml
services:
  n8n:
    image: n8nio/n8n
    labels:
      traefik.enable: "true"
      traefik.http.routers.n8n.rule: "Host(`n8n.example.com`)"
      traefik.http.routers.n8n.entrypoints: web
      traefik.http.services.n8n.loadbalancer.server.port: "5678"
      traefik.docker.network: kiban
    networks:
      - default
      - kiban
```

## Shared Network

All services with web access points are connected to the `kiban` Docker network. Traefik joins this network to route traffic to any service without exposing host ports.

## Service Lifecycle

| Action | Traefik effect |
|---|---|
| Install service | Labels written, `up -d` |
| Update domain | Labels rewritten, `up -d --force-recreate` |
| Stop service | Labels preserved, containers stopped |
| Restart service | Labels preserved, containers restarted |
| Delete service | Compose down -v, workspace removed |

---

# API Reference

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/settings/domain` | GET | Read Instance Domain |
| `/api/settings/domain` | PUT | Set Instance Domain |
| `/api/settings/wildcard-domain` | GET | Read Wildcard Domain |
| `/api/settings/wildcard-domain` | PUT | Set Wildcard Domain |
| `/api/settings/traefik` | GET | Traefik status and active routers |
| `/api/services/:id/domain` | PATCH | Override a service's domain |

---

# Limitations

- Changing the Wildcard Domain does not update existing services.
- Per-service domain override applies to all web access points of that service (not per-endpoint).
- `.localhost` domains only work on the local machine.
- Domain routing requires the installed Docker runtime (not development mode).
- SSL/TLS termination is not managed by Kiban. Use Cloudflare, a tunnel provider, or your own certificate setup.
