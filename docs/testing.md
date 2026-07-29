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

- Auth service DTO validation.
- Core error to HTTP exception mapping.
- Login response and cookie-token payload handoff.
- `/me` authentication handling.
- Password-change service behavior.
- Users service admin authorization behavior.
- Operator creation and deletion error mapping.

### Web

- Auth HTTP client calls with credentials enabled.
- Register-admin flow followed by login.
- Local auth state after login/session restore.
- Local auth state clearing after password change/logout.
- Users HTTP client calls for list/create/delete operators.
