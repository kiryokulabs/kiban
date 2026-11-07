import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { APP_GUARD, NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AuthManager, UserManager, UserPreferencesManager, type PasswordHasher, type User } from '@kiban/core';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseService } from '../../database/database.service';
import { configureHttpApplication } from '../../main';
import { AuthController } from '../auth/controllers/auth.controller';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { SqliteAuthSessionRepository } from '../auth/repositories/sqlite-auth-session.repository';
import { SqliteUserRepository } from '../auth/repositories/sqlite-user.repository';
import { AuthService } from '../auth/services/auth.service';
import { LoginRateLimiter } from '../auth/services/login-rate-limiter';
import { NodeSessionTokenService } from '../auth/services/node-session-token.service';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';

let directory: string;
let database: DatabaseService;
let repository: SqliteUserRepository;
let app: NestFastifyApplication;
let admin: User;
let operator: User;
const headers = { 'x-kiban-request': '1' };
const passwordHasher: PasswordHasher = { hash: async password => `test:${password}`, verify: async (password, hash) => hash === `test:${password}` };

beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), 'kiban-user-activity-'));
  database = new DatabaseService({ databasePath: join(directory, 'test.sqlite') });
  // A pre-feature schema ensures migration is exercised, not only fresh installs.
  await database.exec('CREATE TABLE auth_sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, revoked_at INTEGER);');
  await database.onModuleInit();
  repository = new SqliteUserRepository(database);
  admin = await repository.createAdmin({ email: 'admin@example.com', passwordHash: 'test:password123' });
  operator = await repository.createOperator({ email: 'operator@example.com', passwordHash: 'test:password123' });
  const manager = new AuthManager(repository, new SqliteAuthSessionRepository(database), passwordHasher, new NodeSessionTokenService(), { sessionTtlMs: 60_000, now: () => new Date() });
  const auth = new AuthService(manager, new LoginRateLimiter(database));
  const preferences = new UserPreferencesManager({ findByUserId: async () => null, save: async (userId, theme, updatedAt) => ({ userId, theme, updatedAt }) });
  const users = new UsersService(manager, new UserManager(repository, passwordHasher), preferences);
  Reflect.defineMetadata('design:paramtypes', [AuthService], AuthController);
  Reflect.defineMetadata('design:paramtypes', [UsersService], UsersController);
  @Module({ controllers: [AuthController, UsersController], providers: [
    { provide: AuthService, useValue: auth }, { provide: UsersService, useValue: users },
    { provide: APP_GUARD, useFactory: () => new SessionAuthGuard(auth, new Reflector()) }
  ] }) class TestModule {}
  app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter({ trustProxy: ['loopback', 'uniquelocal'] }), { logger: false });
  await configureHttpApplication(app);
  await app.init();
});
afterEach(async () => { if (app) await app.close(); rmSync(directory, { recursive: true, force: true }); });

async function login(user: User, ip: string, forwarded?: string): Promise<string> {
  const response = await app.inject({ method: 'POST', url: '/api/auth/login', remoteAddress: ip, headers: { ...headers, ...(forwarded ? { 'x-forwarded-for': forwarded } : {}) }, payload: { email: user.email, password: 'password123' } });
  expect(response.statusCode).toBe(200);
  return String(response.headers['set-cookie']).split(';')[0] ?? '';
}

describe('Administrator login activity', () => {
  it('does not mistake a newer admin login for the requesting browser session', async () => {
    const cookie = await login(admin, '192.0.2.1');
    await login(admin, '192.0.2.9');
    const response = await app.inject({ method: 'GET', url: '/api/users/activity', headers: { cookie } });
    expect(response.statusCode).toBe(200);
    const activity: { userId: string; lastLoginIp: string; activeSessions: number; currentSession: { ipAddress: string } | null }[] = response.json();
    expect(activity.find(row => row.userId === admin.id)).toMatchObject({ lastLoginIp: '192.0.2.9', activeSessions: 2, currentSession: { ipAddress: '192.0.2.1' } });
  });

  it('preserves an existing account and valid session when migrating the pre-IP schema', async () => {
    const legacy = new DatabaseService({ databasePath: join(directory, 'legacy.sqlite') });
    await legacy.exec(`
      CREATE TABLE users (id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,role TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
      CREATE TABLE auth_sessions (id TEXT PRIMARY KEY,user_id TEXT NOT NULL,token_hash TEXT NOT NULL UNIQUE,expires_at INTEGER NOT NULL,created_at INTEGER NOT NULL,revoked_at INTEGER);
    `);
    const tokenHash = await new NodeSessionTokenService().hashToken('legacy-token');
    await legacy.run('INSERT INTO users VALUES (?,?,?,?,?,?)', ['legacy-user', 'legacy@example.com', 'test:password123', 'admin', new Date(), new Date()]);
    await legacy.run('INSERT INTO auth_sessions VALUES (?,?,?,?,?,NULL)', ['legacy-session', 'legacy-user', tokenHash, new Date(Date.now() + 60_000), new Date()]);
    await legacy.onModuleInit();
    await legacy.onModuleInit();
    expect((await new SqliteUserRepository(legacy).findById('legacy-user'))?.email).toBe('legacy@example.com');
    expect(await new SqliteAuthSessionRepository(legacy).findActiveByTokenHash(tokenHash, new Date())).toMatchObject({ userId: 'legacy-user', ipAddress: null });
  });

  it('reports admin and operator logins, IPv4/IPv6 and only the requesting current session, without secrets', async () => {
    const cookie = await login(admin, '192.0.2.1');
    await login(operator, '2001:db8::1');
    const response = await app.inject({ method: 'GET', url: '/api/users/activity', headers: { cookie } });
    expect(response.statusCode).toBe(200);
    const activity: { userId: string; lastLoginAt: string; lastLoginIp: string; activeSessions: number; currentSession: { ipAddress: string } | null }[] = response.json();
    expect(activity.find(row => row.userId === admin.id)).toMatchObject({ lastLoginIp: '192.0.2.1', activeSessions: 1, currentSession: { ipAddress: '192.0.2.1' } });
    expect(activity.find(row => row.userId === operator.id)).toMatchObject({ lastLoginIp: '2001:db8::1', activeSessions: 1, currentSession: null });
    expect(Date.parse(activity[0]?.lastLoginAt ?? '')).not.toBeNaN();
    expect(response.body).not.toMatch(/password|token|sessionId|tokenHash|test:/i);
  });

  it('does not expose any activity to anonymous users or operators, including forged query parameters', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/users/activity' })).statusCode).toBe(401);
    const cookie = await login(operator, '192.0.2.2');
    expect((await app.inject({ method: 'GET', url: `/api/users/activity?role=admin&userId=${admin.id}`, headers: { cookie } })).statusCode).toBe(403);
  });

  it('migrates legacy sessions, keeps unknown IPs null and preserves logins across logout and restart', async () => {
    await database.run('INSERT INTO auth_sessions (id,user_id,token_hash,expires_at,created_at,revoked_at) VALUES (?,?,?,?,?,NULL)', ['legacy', operator.id, 'legacy-secret', new Date(Date.now() + 60_000), new Date()]);
    let activity = await repository.listActivity(new Date());
    expect(activity.find(row => row.userId === operator.id)).toMatchObject({ lastLoginIp: null, activeSessions: 1 });
    const cookie = await login(admin, '192.0.2.1');
    await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { ...headers, cookie } });
    await database.onModuleInit();
    activity = await repository.listActivity(new Date());
    expect(activity.find(row => row.userId === admin.id)).toMatchObject({ lastLoginIp: '192.0.2.1', activeSessions: 0 });
    expect(activity.find(row => row.userId === operator.id)?.lastLoginIp).toBeNull();
  });

  it('counts only unrevoked, unexpired sessions and pairs the latest IP with its login date', async () => {
    const sessions = new SqliteAuthSessionRepository(database);
    for (const [id, ip] of [['first', '192.0.2.1'], ['second', '192.0.2.2'], ['third', '192.0.2.3']] as const) {
      await sessions.create({ userId: operator.id, passwordHash: operator.passwordHash, tokenHash: id, ipAddress: ip, expiresAt: new Date(Date.now() + 60_000) });
    }
    await database.run('UPDATE auth_sessions SET created_at = ? WHERE token_hash = ?', [new Date(Date.now() + 1000), 'third']);
    await sessions.revokeByTokenHash('third', new Date());
    await database.run('UPDATE auth_sessions SET expires_at = 0 WHERE token_hash = ?', ['second']);
    const activity = await repository.listActivity(new Date());
    expect(activity.find(row => row.userId === operator.id)).toMatchObject({ lastLoginIp: '192.0.2.3', activeSessions: 1 });
    expect(activity.find(row => row.userId === admin.id)).toMatchObject({ lastLoginAt: null, lastLoginIp: null, activeSessions: 0 });
    await repository.changePasswordAndRevokeSessions(operator.id, operator.passwordHash, 'changed', new Date());
    expect((await repository.listActivity(new Date())).find(row => row.userId === operator.id)?.activeSessions).toBe(0);
  });

  it('uses the trusted proxy client IP and ignores spoofed forwarding from an untrusted peer', async () => {
    await login(admin, '127.0.0.1', '198.51.100.5');
    await login(operator, '192.0.2.2', '198.51.100.99');
    const activity = await repository.listActivity(new Date());
    expect(activity.find(row => row.userId === admin.id)?.lastLoginIp).toBe('198.51.100.5');
    expect(activity.find(row => row.userId === operator.id)?.lastLoginIp).toBe('192.0.2.2');
  });

  it('never records a failed login or caller-supplied IP metadata', async () => {
    for (const payload of [
      { email: operator.email, password: 'wrong-password' },
      { email: operator.email, password: 'password123', ipAddress: '198.51.100.99' }
    ]) {
      const response = await app.inject({ method: 'POST', url: '/api/auth/login', headers, payload });
      expect([400, 401]).toContain(response.statusCode);
    }
    expect((await repository.listActivity(new Date())).find(row => row.userId === operator.id)).toMatchObject({ lastLoginAt: null, lastLoginIp: null, activeSessions: 0 });
  });
});
