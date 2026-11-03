import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { scryptSync } from 'node:crypto';
import { NodePasswordHasherService } from './services/node-password-hasher.service';
import { NodeSessionTokenService } from './services/node-session-token.service';
import { AdminRegistrationClosedError, AuthManager } from '@kiban/core';
import { DatabaseService } from '../../database/database.service';
import { SqliteUserRepository } from './repositories/sqlite-user.repository';
import { SqliteAuthSessionRepository } from './repositories/sqlite-auth-session.repository';
import { LoginRateLimiter } from './services/login-rate-limiter';

let directory: string;
let database: DatabaseService;
let users: SqliteUserRepository;
let sessions: SqliteAuthSessionRepository;
const oldHash = 'old-hash';

beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), 'kiban-auth-security-'));
  database = new DatabaseService({ databasePath: join(directory, 'test.sqlite') });
  await database.onModuleInit();
  users = new SqliteUserRepository(database);
  sessions = new SqliteAuthSessionRepository(database);
});
afterEach(() => rmSync(directory, { recursive: true, force: true }));

describe('Authentication persistence security', () => {
  it('upgrades a legacy password on successful login without losing session access', async () => {
    const salt = 'a'.repeat(32);
    const passwordHash = `scrypt:${salt}:${scryptSync('old-password', salt, 64).toString('hex')}`;
    const user = await users.createAdmin({ email: 'admin@example.com', passwordHash });
    const manager = new AuthManager(users, sessions, new NodePasswordHasherService(), new NodeSessionTokenService(), { sessionTtlMs: 60_000, now: () => new Date() });
    const login = await manager.login({ email: user.email, password: 'old-password' });
    expect((await users.findById(user.id))?.passwordHash).toMatch(/^scrypt:32768:8:3:/);
    await expect(manager.authenticate(login.token)).resolves.toMatchObject({ user: { id: user.id } });
  });

  it('allows only one concurrent initial admin, including across repository instances', async () => {
    const otherUsers = new SqliteUserRepository(new DatabaseService({ databasePath: join(directory, 'test.sqlite') }));
    const results = await Promise.allSettled([
      users.createAdmin({ email: 'first@example.com', passwordHash: oldHash }),
      otherUsers.createAdmin({ email: 'second@example.com', passwordHash: oldHash })
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected?.status === 'rejected' && rejected.reason).toBeInstanceOf(AdminRegistrationClosedError);
    expect((await users.list()).filter((user) => user.role === 'admin')).toHaveLength(1);
  });

  it('changes the password and revokes every session atomically', async () => {
    const user = await users.createAdmin({ email: 'admin@example.com', passwordHash: oldHash });
    const now = new Date();
    for (const tokenHash of ['first', 'second']) await sessions.create({ userId: user.id, tokenHash, expiresAt: new Date(now.getTime() + 60_000), passwordHash: oldHash });
    expect(await users.changePasswordAndRevokeSessions(user.id, oldHash, 'new-hash', now)).toBe(true);
    expect((await users.findById(user.id))?.passwordHash).toBe('new-hash');
    for (const tokenHash of ['first', 'second']) expect(await sessions.findActiveByTokenHash(tokenHash, now)).toBeNull();
  });

  it('rolls back the password change if session revocation fails', async () => {
    const user = await users.createAdmin({ email: 'admin@example.com', passwordHash: oldHash });
    await sessions.create({ userId: user.id, tokenHash: 'first', expiresAt: new Date(Date.now() + 60_000), passwordHash: oldHash });
    await database.exec("CREATE TRIGGER fail_revocation BEFORE UPDATE ON auth_sessions BEGIN SELECT RAISE(ABORT, 'revocation failed'); END;");
    await expect(users.changePasswordAndRevokeSessions(user.id, oldHash, 'new-hash', new Date())).rejects.toThrow();
    expect((await users.findById(user.id))?.passwordHash).toBe(oldHash);
    expect(await sessions.findActiveByTokenHash('first', new Date())).not.toBeNull();
  });

  it('does not create a session with credentials verified before a password change', async () => {
    const user = await users.createAdmin({ email: 'admin@example.com', passwordHash: oldHash });
    await users.changePasswordAndRevokeSessions(user.id, oldHash, 'new-hash', new Date());
    expect(await sessions.create({ userId: user.id, tokenHash: 'stale', expiresAt: new Date(Date.now() + 60_000), passwordHash: oldHash })).toBeNull();
    expect(await sessions.findActiveByTokenHash('stale', new Date())).toBeNull();
  });

  it('never overwrites a changed password during legacy hash upgrade', async () => {
    const user = await users.createAdmin({ email: 'admin@example.com', passwordHash: oldHash });
    await users.changePasswordAndRevokeSessions(user.id, oldHash, 'new-hash', new Date());
    expect(await users.updatePasswordHash(user.id, oldHash, 'upgraded-old-hash', new Date())).toBe(false);
    expect((await users.findById(user.id))?.passwordHash).toBe('new-hash');
  });

  it('rejects stale concurrent password changes without revoking newer sessions', async () => {
    const user = await users.createAdmin({ email: 'admin@example.com', passwordHash: oldHash });
    await users.changePasswordAndRevokeSessions(user.id, oldHash, 'new-hash', new Date());
    await sessions.create({ userId: user.id, tokenHash: 'new-session', expiresAt: new Date(Date.now() + 60_000), passwordHash: 'new-hash' });
    expect(await users.changePasswordAndRevokeSessions(user.id, oldHash, 'stale-hash', new Date())).toBe(false);
    expect((await users.findById(user.id))?.passwordHash).toBe('new-hash');
    expect(await sessions.findActiveByTokenHash('new-session', new Date())).not.toBeNull();
  });
});

describe('Login abuse protection', () => {
  it('limits normalized accounts across IPs and persists limits across restarts', async () => {
    const limiter = new LoginRateLimiter(database);
    for (let i = 0; i < 10; i++) await limiter.consume(`192.0.2.${i}`, 'admin@example.com');
    await expect(new LoginRateLimiter(database).consume('192.0.2.99', ' ADMIN@EXAMPLE.COM ')).rejects.toMatchObject({ status: 429 });
    await expect(limiter.consume('192.0.2.99', 'another@example.com')).resolves.toBeUndefined();
    const rows = await database.all<{ key: string }>('SELECT key FROM auth_login_attempts');
    expect(rows.every((row) => !row.key.includes('admin@example.com'))).toBe(true);
  });

  it('limits an IP even when the attacker rotates email addresses', async () => {
    const limiter = new LoginRateLimiter(database);
    for (let i = 0; i < 100; i++) await limiter.consume('192.0.2.1', `user${i}@example.com`);
    await expect(limiter.consume('192.0.2.1', 'another@example.com')).rejects.toMatchObject({ status: 429 });
  });

  it('expires limits instead of permanently locking out accounts', async () => {
    const limiter = new LoginRateLimiter(database);
    for (let i = 0; i < 10; i++) await limiter.consume('192.0.2.1', 'admin@example.com');
    await database.run('UPDATE auth_login_attempts SET expires_at = 0');
    await expect(limiter.consume('192.0.2.1', 'admin@example.com')).resolves.toBeUndefined();
  });
});
