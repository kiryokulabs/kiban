import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { APP_GUARD, NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthManager } from '@kiban/core';
import { configureHttpApplication } from '../../main';
import { AuthController } from './controllers/auth.controller';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { AuthService } from './services/auth.service';
import type { LoginRateLimiter } from './services/login-rate-limiter';

let app: NestFastifyApplication;
const user = { id: 'user-1', email: 'admin@example.com', role: 'admin' as const };

beforeEach(async () => {
  const fullUser = { ...user, passwordHash: 'hash', createdAt: new Date(), updatedAt: new Date() };
  const manager: Partial<AuthManager> = {
    login: vi.fn(async () => ({ token: 'test-token', expiresAt: new Date(Date.now() + 60_000), user: fullUser })),
    authenticate: vi.fn(async () => ({ user: fullUser, session: { id: 'session-1', userId: user.id, tokenHash: 'hash', createdAt: new Date(), expiresAt: new Date(Date.now() + 60_000) } }))
  };
  const limiter: Pick<LoginRateLimiter, 'consume'> = { consume: vi.fn(async () => undefined) };
  const auth = new AuthService(manager as AuthManager, limiter as LoginRateLimiter);
  Reflect.defineMetadata('design:paramtypes', [AuthService], AuthController);
  @Module({ controllers: [AuthController], providers: [
    { provide: AuthService, useValue: auth },
    { provide: APP_GUARD, useFactory: () => new SessionAuthGuard(auth, new Reflector()) }
  ] })
  class TestModule {}
  app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter({ trustProxy: ['loopback', 'uniquelocal'] }), { logger: false });
  await configureHttpApplication(app);
  await app.init();
});
afterEach(async () => { await app.close(); });

describe('HTTP authentication transport', () => {
  it('rejects cross-origin credentialed preflights', async () => {
    const response = await app.inject({ method: 'OPTIONS', url: '/api/auth/login', headers: { origin: 'https://evil.example', 'access-control-request-method': 'POST', 'access-control-request-headers': 'x-kiban-request' } });
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('does not allow a browser form to log in without the API header', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: user.email, password: 'password123' } });
    expect(response.statusCode).toBe(403);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it.each([false, true])('keeps HTTP installation access and marks HTTPS cookies Secure (https=%s)', async (https) => {
    const response = await app.inject({ method: 'POST', url: '/api/auth/login', remoteAddress: '127.0.0.1', headers: { 'x-kiban-request': '1', 'x-forwarded-proto': https ? 'https' : 'http', 'x-forwarded-for': '192.0.2.50' }, payload: { email: user.email, password: 'password123' } });
    expect(response.statusCode).toBe(200);
    const cookie = String(response.headers['set-cookie']);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(/; Secure(?:;|$)/.test(cookie)).toBe(https);
    expect(response.json()).toEqual({ user });
    expect(response.body).not.toContain('test-token');
  });

  it('does not trust forwarded protocol from an untrusted direct peer', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/auth/login', remoteAddress: '192.0.2.1', headers: { 'x-kiban-request': '1', 'x-forwarded-proto': 'https', 'x-forwarded-for': '192.0.2.50' }, payload: { email: user.email, password: 'password123' } });
    expect(String(response.headers['set-cookie'])).not.toContain('; Secure');
  });

  it('returns a controlled 400 for malformed credentials', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/auth/login', headers: { 'x-kiban-request': '1' }, payload: {} });
    expect(response.statusCode).toBe(400);
  });

  it('rejects protected reads without a session', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/auth/me' })).statusCode).toBe(401);
  });
});
