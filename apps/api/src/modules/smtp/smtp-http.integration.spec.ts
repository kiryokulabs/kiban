import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { APP_GUARD, NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { SmtpSettingsManager, SmtpDeliveryError, UnauthenticatedError, type AuthManager, type SmtpSettings, type SmtpSettingsRepository, type SmtpSender } from '@kiban/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureHttpApplication } from '../../main';
import { AuthService } from '../auth/services/auth.service';
import type { LoginRateLimiter } from '../auth/services/login-rate-limiter';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { SmtpController } from './smtp.controller';
import { SmtpService } from './smtp.service';

let app: NestFastifyApplication;
let sender: SmtpSender;
let repository: SmtpSettingsRepository;
const payload = { host: 'localhost', port: 1025, security: 'none', username: '', fromName: 'Kiban', fromEmail: 'kiban@example.com' };
const headers = { cookie: 'kiban_session=admin', 'x-kiban-request': '1' };

beforeEach(async () => {
  let stored: SmtpSettings | null = null;
  repository = { get: vi.fn(async () => stored), save: vi.fn(async (value) => { stored = value; }) };
  sender = { send: vi.fn(async () => undefined) };
  const manager = new SmtpSettingsManager(repository, sender);
  const authManager: Partial<AuthManager> = { authenticate: vi.fn(async (token) => {
    if (token !== 'admin' && token !== 'operator') throw new UnauthenticatedError();
    return { user: { id: token, email: `${token}@example.com`, role: token, passwordHash: 'hash', createdAt: new Date(), updatedAt: new Date() }, session: { id: 'session-1', userId: token, tokenHash: 'hash', expiresAt: new Date(Date.now() + 60_000), createdAt: new Date() } };
  }) };
  const limiter: Pick<LoginRateLimiter, 'consume'> = { consume: vi.fn(async () => undefined) };
  const auth = new AuthService(authManager as AuthManager, limiter as LoginRateLimiter);
  Reflect.defineMetadata('design:paramtypes', [SmtpService], SmtpController);
  @Module({ controllers: [SmtpController], providers: [
    { provide: SmtpService, useValue: new SmtpService(auth, manager) },
    { provide: APP_GUARD, useFactory: () => new SessionAuthGuard(auth, new Reflector()) }
  ] })
  class TestModule {}
  app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter(), { logger: false });
  await configureHttpApplication(app);
  await app.init();
});
afterEach(async () => { await app.close(); });

describe('SMTP API permissions', () => {
  it.each(['GET', 'PUT', 'POST'] as const)('enforces authentication and write permissions for %s requests', async (method) => {
    const url = method === 'POST' ? '/api/notifications/smtp/test' : '/api/notifications/smtp';
    for (const [cookie, expected] of [['', 401], ['kiban_session=operator', method === 'GET' ? 200 : 403]] as const) {
      const response = await app.inject({ method, url, headers: { cookie, 'x-kiban-request': '1' }, ...(method === 'PUT' ? { payload } : {}) });
      expect(response.statusCode).toBe(expected);
    }
    if (method !== 'GET') expect(repository.get).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
    expect(sender.send).not.toHaveBeenCalled();
  });

  it('loads, saves and sends using the authenticated admin email, not a caller-selected recipient', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/notifications/smtp', headers })).json()).toEqual(null);
    expect((await app.inject({ method: 'PUT', url: '/api/notifications/smtp', headers, payload })).statusCode).toBe(200);
    const response = await app.inject({ method: 'POST', url: '/api/notifications/smtp/test', headers, payload: { recipient: 'attacker@example.com' } });
    expect(response.statusCode).toBe(204);
    expect(sender.send).toHaveBeenCalledWith(expect.objectContaining({ host: 'localhost' }), expect.objectContaining({ to: 'admin@example.com', subject: 'Kiban SMTP test' }));
  });

  it('returns only the hasPassword flag, never the stored password', async () => {
    const secret = { ...payload, security: 'starttls', username: 'smtp-user', password: 'private-password' };
    const saved = await app.inject({ method: 'PUT', url: '/api/notifications/smtp', headers, payload: secret });
    expect(saved.statusCode).toBe(200);
    expect(saved.body).not.toContain('private-password');
    expect(saved.json()).toHaveProperty('hasPassword', true);
    const loaded = await app.inject({ method: 'GET', url: '/api/notifications/smtp', headers: { cookie: 'kiban_session=operator' } });
    expect(loaded.statusCode).toBe(200);
    expect(loaded.body).not.toContain('private-password');
    expect(loaded.json()).not.toHaveProperty('password');
  });

  it('returns controlled errors for unconfigured, invalid and failed SMTP', async () => {
    expect((await app.inject({ method: 'POST', url: '/api/notifications/smtp/test', headers })).statusCode).toBe(400);
    expect((await app.inject({ method: 'PUT', url: '/api/notifications/smtp', headers, payload: {} })).statusCode).toBe(400);
    await app.inject({ method: 'PUT', url: '/api/notifications/smtp', headers, payload });
    vi.mocked(sender.send).mockRejectedValue(new SmtpDeliveryError('SMTP authentication failed.'));
    expect((await app.inject({ method: 'POST', url: '/api/notifications/smtp/test', headers })).statusCode).toBe(502);
    vi.mocked(repository.get).mockRejectedValue(new Error('private-password storage details'));
    const response = await app.inject({ method: 'GET', url: '/api/notifications/smtp', headers });
    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('private-password');
  });

  it('keeps CSRF protection on SMTP writes', async () => {
    expect((await app.inject({ method: 'PUT', url: '/api/notifications/smtp', headers: { cookie: headers.cookie }, payload })).statusCode).toBe(403);
  });
});
