# Testing

Kiban uses Vitest for unit tests.

## Run all tests

```bash
pnpm test
```

## Run tests by workspace

```bash
pnpm --filter @kiban/core test
pnpm --filter @kiban/api test
pnpm --filter @kiban/web test
```

## Current coverage focus

### Core

- Project creation with default environments.
- Project creation rollback behaviour.
- Project validation, update, delete and environment reads.
- Admin bootstrap status.
- First admin registration.
- Blocking repeated admin registration.
- Login/session token hashing flow.
- Authentication from opaque session token.
- Password change and automatic session revocation.
- Admin-only user management.
- Operator creation/deletion rules.
- Admin deletion protection.

### API

- Project service validation and DTO mapping.
- Project not-found and validation error mapping.
- Auth service DTO validation.
- Core error to HTTP exception mapping.
- Login response and cookie-token payload handoff.
- `/me` authentication handling.
- Password-change service behavior.
- Users service admin authorization behavior.
- Operator creation and deletion error mapping.
- **Terminal: DockerComposeTerminalProvider container validation**
- **Terminal: TerminalSessionService session lifecycle and timeouts**
- **Terminal: TerminalGateway WebSocket event handling**

### Web

- Projects HTTP client calls for list/create/get/update/delete/environments.
- Auth HTTP client calls with credentials enabled.
- Register-admin flow followed by login.
- Local auth state after login/session restore.
- Local auth state clearing after password change/logout.
- Users HTTP client calls for list/create/delete operators.
- Theme service default mode, cookie restore and cookie persistence.
- **Terminal: TerminalPresenter container options and state labels**
- **Terminal: TerminalService Socket.IO transport and state machine**

## Authentication security regressions

The API tests also cover real temporary SQLite transactions (concurrent bootstrap,
password-change rollback, all-session revocation, stale login/rehash rejection and
persistent attempt limits), HTTP cookie/CSRF/CORS behavior, and live local Socket.IO
connections with a simulated terminal provider. The socket integration tests need
permission to listen on an ephemeral localhost port; they do not invoke Docker or
use real accounts. Password tests verify both legacy and current scrypt hashes.

## SMTP coverage

SMTP tests cover authenticated read access, administrator-only writes/test sends, strict
validation, write-only passwords,
encrypted persistence across restarts, isolated SMTP settings writes, and key permissions.
Local integration fixtures exercise unauthenticated SMTP, TLS, STARTTLS, unavailable
STARTTLS and untrusted certificates. They listen only on ephemeral localhost ports and
generate temporary self-signed test certificates with OpenSSL; no email is sent to the
internet. Frontend tests cover the Notifications page/sidebar, operator read-only access, loading,
saving, preserved credentials and test-send errors.

## Continuous Integration

GitHub Actions runs unit tests on every push and pull request using:

```bash
pnpm install --frozen-lockfile
pnpm test
```

Workflow file:

```txt
.github/workflows/tests.yml
```

## User login activity

Core tests verify administrator authorization before reading account activity. HTTP/SQLite
integration tests cover legacy-schema migration and repeat initialization, successful vs
failed logins, IPv4/IPv6, trusted/untrusted proxy forwarding, anonymous/operator rejection,
paired latest-login date/IP, expiry/logout/password-change session counts, current-session
metadata and exclusion of secrets. Fixtures use temporary databases and simulated HTTP
requests; they never modify the installation database. Web tests cover the authenticated
activity request, account/activity loading, failure isolation and responsive panel layout.

## Dashboard operational activity

Activity tests use real temporary SQLite persistence, HTTP controllers/session guards,
project/service managers and a simulated runtime (no Docker). They cover all explicit
project/environment CRUD and service lifecycle events, authenticated operator access,
anonymous rejection, server-side actor attribution, surviving deleted resources, failed
operations/runtime outcomes, populated deletion guards, auxiliary-storage failures,
restart persistence, bounded 1,000-event retention and the fixed newest-five response.
Frontend tests cover the authenticated read, real-event loading and unavailable-history
state without sample-data fallback.


Events/Logs navigation tests cover the shared Events sidebar entry, default Events route,
bookmarkable button-style links, active state and backwards-compatible `/logs` redirect.
History tests cover authenticated fixed-size pagination, empty/end pages, invalid and
repeated page parameters, deterministic ordering and an unchanged five-event dashboard.
Frontend tests also cover page loading, request overlap prevention and read failures.


## Server images

Core tests verify admin-only deletion. Provider/HTTP tests cover all-daemon image listing,
references from running/stopped/external containers, stale listings, full-ID validation,
CSRF/role enforcement, missing images, Docker conflicts, malformed metadata and unavailable
sockets. An isolated fake Unix-socket Engine verifies actual HTTP request paths and the
fixed `force=false&noprune=true` delete flags; no real Docker images are removed. Web tests
cover Server routes and legacy redirects, read-only operator access, confirmation, duplicate
request prevention, deletion failure feedback and authenticated API calls.

Image-tag regressions additionally cover separate rows sharing one image ID, per-tag
confirmation/API calls, malformed selectors, tag reassignment, a new stopped-container
reference during tag resolution, and sequential tagged deletion through the simulated
Unix socket while preserving the other tag. No real images are removed by these tests.

Service-association regressions match image IDs and actual container project labels to
installed runtime metadata, deduplicate repeated containers, support multiple services
sharing an image and keep external/unknown associations empty without exposing secrets.
Frontend tests retain that information on each tag row and render an empty service cell
when there is no known Kiban service.

Core-image regressions cover the exact internal Compose project/service identities,
stopped core containers, protection of every tag, old unused image cleanup, unrelated
Traefik deployments and shared core/user image IDs. HTTP tests verify operator-visible
core metadata and backend rejection of forged admin deletion flags; UI tests verify the
KibanOS Core label, warning and deletion guards.
