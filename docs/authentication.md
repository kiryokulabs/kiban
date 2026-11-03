# Kiban Authentication

Kiban uses a first-run administrator bootstrap flow inspired by Coolify.

## Goal

A fresh Kiban installation must allow creating exactly one initial administrator account. After an admin account exists, public registration is permanently closed and the UI only shows login.

## Flow

### 1. Bootstrap status

The web app starts by calling:

```http
GET /auth/bootstrap-status
```

Response when no admin exists:

```json
{ "requiresAdminSetup": true }
```

Response when an admin already exists:

```json
{ "requiresAdminSetup": false }
```

The web UI has three explicit states:

1. Checking API status.
2. API unavailable.
3. Resolved setup/login state.

The login screen is only shown when the API explicitly returns `requiresAdminSetup: false`.

### 2. First admin registration

If `requiresAdminSetup` is `true`, the UI displays **Create admin account** and calls:

```http
POST /auth/register-admin
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "strong-password"
}
```

The API refuses this request once an admin user exists.

### 3. Login

After the first admin exists, the UI displays login and calls:

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "strong-password"
}
```

On success, the API writes an httpOnly cookie:

```txt
kiban_session=<opaque-token>
```

The session token is opaque. Kiban stores only a SHA-256 hash of the token in SQLite.

### 4. Session restore

The web app restores the current session by calling:

```http
GET /auth/me
```

The browser sends the `kiban_session` cookie automatically because frontend requests use credentials.

### 5. Logout

Logout calls:

```http
POST /auth/logout
```

The API revokes the server-side session and clears the cookie.

## API endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/auth/bootstrap-status` | Returns whether initial admin setup is required. |
| `POST` | `/auth/register-admin` | Creates the first admin account only. |
| `POST` | `/auth/login` | Creates an authenticated session and sets an httpOnly cookie. |
| `POST` | `/auth/change-password` | Changes the current user password and revokes all their sessions. |
| `POST` | `/auth/logout` | Revokes the current session and clears the cookie. |
| `GET` | `/auth/me` | Returns the current authenticated user. |

## Architecture

Authentication follows Kiban's clean architecture boundaries.

### Core package

Location:

```txt
packages/core/src/domain/auth
packages/core/src/domain/users
packages/core/src/application/managers/auth-manager.ts
packages/core/src/application/interfaces
```

Core owns:

- `AuthManager`
- `User`
- `AuthSession`
- `UserRepository`
- `AuthSessionRepository`
- `PasswordHasher`
- `SessionTokenService`

Core does **not** know about:

- NestJS
- Angular
- SQLite
- cookies
- Docker

### API app

Location:

```txt
apps/api/src/modules/auth
apps/api/src/database
```

API owns:

- NestJS controllers/services.
- Cookie transport.
- SQLite persistence adapters.
- Password hashing implementation.
- Session token generation/hash implementation.
- User management controllers/services for admin-managed operators.

### Web app

Location:

```txt
apps/web/src/app/auth
apps/web/src/app/app.component.ts
```

Web owns:

- Bootstrap/setup UI.
- Login UI.
- Logout action.
- Session restoration.
- HTTP calls with credentials enabled.


## Roles

Kiban currently has two roles:

| Role | Purpose |
| --- | --- |
| `admin` | The single administrator created during first-run bootstrap. There can only be one admin. |
| `operator` | A non-admin user created by the administrator to operate Kiban without managing users. |

Rules:

- The first registered account is always `admin`.
- Public registration closes permanently after the admin exists.
- The admin can create operator accounts.
- The admin can delete operator accounts.
- The admin account cannot be deleted.
- Operators can view their own profile and change their own password.
- Operators cannot create users, delete users, or delete/modify the admin account.

## User management endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/users` | Lists users. Admin only. |
| `POST` | `/users/operators` | Creates an operator account. Admin only. |
| `DELETE` | `/users/:id` | Deletes an operator account. Admin only; admin deletion is blocked. |

## SQLite database

The local database lives at:

```txt
~/.kiban/database/kiban.sqlite
```

Useful commands:

```bash
pnpm -w run db:path
pnpm -w run db:check
pnpm -w run db:status
```

Open manually:

```bash
sqlite3 ~/.kiban/database/kiban.sqlite
```

Inspect tables:

```sql
.tables
select id, email, role, created_at from users;
select id, user_id, expires_at, revoked_at from auth_sessions;
```

Reset local dev database:

```bash
pnpm -w run db:reset:dev
```

Only use reset in development.

## Security

The backend is the sole authority for identity, roles, session expiration and revocation.
Angular's user state is only for display. No authentication tokens are stored in browser
storage or returned in JSON responses.

### Local and VPS access

- Localhost and direct `http://IP:8080` access remain available for installation and recovery.
- HTTP does **not** encrypt passwords or session cookies. For a VPS, use HTTPS through the
  Instance Domain, or access the HTTP installation address through a trusted SSH tunnel/VPN.
- HTTPS logins set `Secure`, `HttpOnly`, `SameSite=Lax` session cookies. HTTP installation
  access uses `HttpOnly` and `SameSite=Lax` without `Secure` so local bootstrap still works.
- The bundled Nginx proxy preserves the original host/port and HTTPS protocol from Traefik.
  Trusted proxy networks default to loopback and private networks for the bundled deployment.
  Keep the API internal. For a custom proxy/network, restrict `KIBAN_TRUSTED_PROXIES` to
  the proxy's IP/CIDR list (comma-separated); an empty value disables proxy trust.
  Never put untrusted clients in those trusted networks. TLS proxies must overwrite
  `X-Forwarded-Proto` and supply the client address in `X-Forwarded-For`.

### Browser request protection

Angular and the API share an origin via the bundled or development proxy. Credentialed
cross-origin API access is disabled. Every state-changing HTTP API request, including
login, registration and logout, must include `X-Kiban-Request: 1`. Angular adds it only
for relative `/api/` requests. External web pages cannot send that custom header without
an approved CORS preflight. Cookie-authenticated scripts/CLI clients must add it too.

The terminal additionally validates the exact browser origin, including scheme and port.
For same-origin polling GETs without an Origin header, it validates the Referer origin instead.
Only the current localhost/IP installation address or persisted HTTPS Instance Domain is
accepted; installed-service subdomains are not trusted dashboard origins.

### Passwords and sessions

- New hashes use scrypt `N=32768, r=8, p=3` (OWASP's 32 MiB profile), a random 16-byte salt
  and explicit stored parameters. Existing hashes remain valid and are upgraded on successful
  login using a compare-and-set update, never overwriting a concurrent password change.
- Login performs both legacy/current verification work even for nonexistent accounts or
  malformed stored hashes, with a generic invalid-credentials response.
- Credentials and password changes are runtime-validated; malformed bodies and unexpected
  fields return 400. Passwords are never trimmed and are limited to 1024 UTF-8 bytes.
- Session tokens contain 48 random bytes; only SHA-256 token hashes are persisted.
- Initial admin creation is atomic and protected by a partial unique database index. If an
  existing database already contains multiple admins, startup fails rather than silently
  deleting accounts; resolve that inconsistency explicitly before upgrading.
- Password changes and revocation of **all** user sessions commit in one transaction.
  Stale concurrent logins/rehashes cannot recreate access using the old password.
- WebSockets authenticate independently of the global HTTP guard, revalidate before opening
  a terminal or forwarding input/resize, and close on session expiration. Logout and password
  changes close matching sockets immediately in the API process; a 30-second backend recheck
  also detects deletion/revocation by other processes. These checks never rely on Angular.

### Login abuse protection

Login and bootstrap registration are limited before password hashing: 10 attempts per
normalized email and 100 per client IP in a fixed 15-minute window. Counters persist in
SQLite across API restarts, store hashed keys instead of raw email/IP values, and expire
automatically. Requests above the limit return 429; they do not disable the account,
change its password or revoke existing sessions. Trusted proxy configuration determines
which forwarded client addresses the backend accepts.

Password recovery and MFA are not implemented by these changes.
