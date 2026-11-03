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
