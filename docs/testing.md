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

### Web

- Projects HTTP client calls for list/create/get/update/delete/environments.
- Auth HTTP client calls with credentials enabled.
- Register-admin flow followed by login.
- Local auth state after login/session restore.
- Local auth state clearing after password change/logout.
- Users HTTP client calls for list/create/delete operators.
- Theme service default mode, cookie restore and cookie persistence.

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
