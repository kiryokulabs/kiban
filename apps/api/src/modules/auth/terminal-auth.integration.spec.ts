import 'reflect-metadata';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { APP_GUARD, NestFactory, Reflector } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { UnauthenticatedError, type AuthManager } from '@kiban/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configureHttpApplication } from '../../main';
import { AuthController } from './controllers/auth.controller';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { AuthService } from './services/auth.service';
import { AuthTransportPolicy } from './services/auth-transport-policy';
import type { LoginRateLimiter } from './services/login-rate-limiter';
import { TerminalGateway } from '../service/terminal/terminal.gateway';
import { TerminalSessionService } from '../service/terminal/terminal-session.service';

interface TestSocket {
  on(event: string, handler: (...args: readonly unknown[]) => void): void;
  emit(event: string, payload: unknown): void;
  disconnect(): void;
}
// Reuse the existing frontend client in integration tests; no new production dependency.
const { io } = createRequire(resolve(__dirname, '../../../../web/package.json'))('socket.io-client') as { io(url: string, options: Readonly<Record<string, unknown>>): TestSocket };
let app: NestFastifyApplication;
let baseUrl: string;
const clients: TestSocket[] = [];
let sessions: { open: ReturnType<typeof vi.fn>; write: ReturnType<typeof vi.fn>; resize: ReturnType<typeof vi.fn>; close: ReturnType<typeof vi.fn> };

function event(socket: TestSocket, name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Missing socket event: ${name}`)), 2000);
    socket.on(name, () => { clearTimeout(timeout); resolve(); });
    socket.on('connect_error', () => { clearTimeout(timeout); reject(new Error('Socket connection failed.')); });
  });
}

function connect(cookie: string | undefined, origin = baseUrl): TestSocket {
  const socket = io(`${baseUrl}/terminal`, { transports: ['websocket'], reconnection: false, extraHeaders: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}) } });
  clients.push(socket);
  socket.on('connect', () => socket.emit('terminal:connect', { serviceId: 'known-service', containerId: 'known-container' }));
  return socket;
}

beforeEach(async () => {
  let revoked = false;
  const user = { id: 'user-1', email: 'admin@example.com', role: 'admin' as const };
  const manager: Partial<AuthManager> = {
    authenticate: vi.fn(async (token: string | null) => {
      if (token !== 'valid-session' || revoked) throw new UnauthenticatedError();
      return { user: { ...user, passwordHash: 'hash', createdAt: new Date(), updatedAt: new Date() }, session: { id: 'session-1', userId: user.id, tokenHash: 'hash', createdAt: new Date(), expiresAt: new Date(Date.now() + 60_000) } };
    }),
    logout: vi.fn(async () => { revoked = true; })
  };
  const limiter: Pick<LoginRateLimiter, 'consume'> = { consume: vi.fn(async () => undefined) };
  const auth = new AuthService(manager as AuthManager, limiter as LoginRateLimiter);
  sessions = { open: vi.fn(async () => ({ sessionId: 'test-terminal' })), write: vi.fn(), resize: vi.fn(), close: vi.fn() };
  const policy = new AuthTransportPolicy({ get: vi.fn(async () => null) } as never);
  Reflect.defineMetadata('design:paramtypes', [AuthService], AuthController);
  Reflect.defineMetadata('design:paramtypes', [TerminalSessionService, AuthService, AuthTransportPolicy], TerminalGateway);
  @Module({ controllers: [AuthController], providers: [
    { provide: AuthService, useValue: auth },
    { provide: AuthTransportPolicy, useValue: policy },
    { provide: TerminalSessionService, useValue: sessions },
    { provide: APP_GUARD, useFactory: () => new SessionAuthGuard(auth, new Reflector()) },
    TerminalGateway
  ] })
  class TestModule {}
  app = await NestFactory.create<NestFastifyApplication>(TestModule, new FastifyAdapter(), { logger: false });
  await configureHttpApplication(app);
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});
afterEach(async () => { for (const socket of clients.splice(0)) socket.disconnect(); await app?.close(); });

describe('Actual Nest/Socket.IO authentication boundary', () => {
  it.each([undefined, 'kiban_session=invalid-session'])('does not reach terminal.open without a valid session', async (cookie) => {
    await event(connect(cookie), 'disconnect');
    expect(sessions.open).not.toHaveBeenCalled();
  });

  it('rejects an untrusted browser origin even with a valid cookie', async () => {
    await event(connect('kiban_session=valid-session', 'https://evil.example'), 'disconnect');
    expect(sessions.open).not.toHaveBeenCalled();
  });

  it('allows valid same-origin use and immediately closes the terminal after HTTP logout', async () => {
    const socket = connect('kiban_session=valid-session');
    await event(socket, 'terminal:connected');
    socket.emit('terminal:input', { data: 'test-input' });
    await vi.waitFor(() => expect(sessions.write).toHaveBeenCalled());
    const disconnected = event(socket, 'disconnect');
    const response = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie: 'kiban_session=valid-session', 'x-kiban-request': '1' } });
    expect(response.statusCode).toBe(204);
    await disconnected;
    expect(sessions.close).toHaveBeenCalled();
  });
  it('accepts the browser polling handshake without Origin when Referer proves the same origin', async () => {
    const socket = io(`${baseUrl}/terminal`, {
      transports: ['polling'],
      reconnection: false,
      extraHeaders: { Cookie: 'kiban_session=valid-session', Referer: `${baseUrl}/services/known-service`, 'Sec-Fetch-Site': 'same-origin' }
    });
    clients.push(socket);
    socket.on('connect', () => socket.emit('terminal:connect', { serviceId: 'known-service', containerId: 'known-container' }));
    await event(socket, 'terminal:connected');
    expect(sessions.open).toHaveBeenCalledOnce();
  });

  it('rejects polling from a foreign Referer even when Origin is absent', async () => {
    const socket = io(`${baseUrl}/terminal`, {
      transports: ['polling'],
      reconnection: false,
      extraHeaders: { Cookie: 'kiban_session=valid-session', Referer: 'https://evil.example/services/test' }
    });
    clients.push(socket);
    await event(socket, 'disconnect');
    expect(sessions.open).not.toHaveBeenCalled();
  });

  it('does not replace an explicitly untrusted Origin with a trusted Referer', async () => {
    const socket = io(`${baseUrl}/terminal`, {
      transports: ['polling'],
      reconnection: false,
      extraHeaders: { Cookie: 'kiban_session=valid-session', Origin: 'https://evil.example', Referer: `${baseUrl}/services/test` }
    });
    clients.push(socket);
    await event(socket, 'disconnect');
    expect(sessions.open).not.toHaveBeenCalled();
  });

  it('still requires a session on same-origin polling requests', async () => {
    const socket = io(`${baseUrl}/terminal`, {
      transports: ['polling'],
      reconnection: false,
      extraHeaders: { Referer: `${baseUrl}/services/test` }
    });
    clients.push(socket);
    await event(socket, 'disconnect');
    expect(sessions.open).not.toHaveBeenCalled();
  });

  it('connects with the frontend default transports through the configured Angular/Vite proxy', async () => {
    interface TestProxyServer { readonly httpServer: Server | null; listen(): Promise<unknown>; close(): Promise<void>; }
    const { createServer } = createRequire(require.resolve('vitest/package.json'))('vite') as { createServer(options: Readonly<Record<string, unknown>>): Promise<TestProxyServer> };
    const proxyConfig = JSON.parse(readFileSync(resolve(__dirname, '../../../../web/proxy.conf.json'), 'utf8')) as Record<string, Record<string, unknown>>;
    const proxy = await createServer({ configFile: false, logLevel: 'silent', server: { host: '127.0.0.1', port: 0, proxy: { '/socket.io': { ...proxyConfig['/socket.io'], target: baseUrl } } } });
    try {
      await proxy.listen();
      const address = proxy.httpServer?.address();
      if (!address || typeof address === 'string') throw new Error('Missing proxy test address.');
      const proxyOrigin = `http://127.0.0.1:${address.port}`;
      const socket = io(`${proxyOrigin}/terminal`, { withCredentials: true, reconnection: false, extraHeaders: { Cookie: 'kiban_session=valid-session', Referer: `${proxyOrigin}/services/known-service` } });
      clients.push(socket);
      socket.on('connect', () => socket.emit('terminal:connect', { serviceId: 'known-service', containerId: 'known-container' }));
      await event(socket, 'terminal:connected');
      expect(sessions.open).toHaveBeenCalledOnce();
      socket.disconnect();
    } finally { await proxy.close(); }
  });

});
