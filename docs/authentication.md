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

## Security notes

Current implementation:

- Uses httpOnly cookie sessions.
- Does not store tokens in `localStorage`.
- Stores only hashed session tokens.
- Uses scrypt for password hashing.
- Disables public registration after first admin creation.

Future hardening:

- Set `secure: true` for cookies in production HTTPS environments.
- Add CSRF protection before exposing non-local deployments.
- Add session management UI.
- Add password rotation and recovery flow.
- Add audit logs for auth events.
