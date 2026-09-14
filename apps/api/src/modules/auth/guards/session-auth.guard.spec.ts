import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthService } from '../services/auth.service';
import { Public, SessionAuthGuard } from './session-auth.guard';

const httpContext = (request: { readonly cookies?: Readonly<Record<string, string | undefined>>; readonly url?: string; readonly method?: string }, handler: () => unknown = () => undefined): ExecutionContext => ({
  getHandler: () => handler,
  getClass: () => class TestController {},
  getType: () => 'http',
  switchToHttp: () => ({ getRequest: () => request }),
  switchToWs: () => ({ getClient: () => ({}) })
}) as unknown as ExecutionContext;

const wsContext = (client: { readonly handshake?: { readonly headers?: Readonly<Record<string, string | undefined>> } }): ExecutionContext => ({
  getHandler: () => () => undefined,
  getClass: () => class TestGateway {},
  getType: () => 'ws',
  switchToHttp: () => ({ getRequest: () => ({}) }),
  switchToWs: () => ({ getClient: () => client })
}) as unknown as ExecutionContext;

const authService = () => ({ me: vi.fn(async () => ({ user: { id: 'user-1', email: 'admin@example.com', role: 'admin' } })) }) as unknown as AuthService;

describe('SessionAuthGuard', () => {
  it('rejects protected HTTP requests without a session cookie', async () => {
    const guard = new SessionAuthGuard(authService(), new Reflector());

    await expect(guard.canActivate(httpContext({ url: '/api/projects', method: 'GET' }))).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('authenticates protected HTTP requests with the session cookie', async () => {
    const auth = authService();
    const guard = new SessionAuthGuard(auth, new Reflector());

    await expect(guard.canActivate(httpContext({ cookies: { kiban_session: 'session-token' }, url: '/api/projects' }))).resolves.toBe(true);

    expect(auth.me).toHaveBeenCalledWith('session-token');
  });

  it('allows endpoints explicitly marked public without a session cookie', async () => {
    const auth = authService();
    const guard = new SessionAuthGuard(auth, new Reflector());
    class PublicController { @Public() public login(): void {} }
    const handler = PublicController.prototype.login;

    await expect(guard.canActivate(httpContext({ url: '/api/auth/login', method: 'POST' }, handler))).resolves.toBe(true);

    expect(auth.me).not.toHaveBeenCalled();
  });

  it('authenticates WebSocket terminal messages from the handshake cookie', async () => {
    const auth = authService();
    const guard = new SessionAuthGuard(auth, new Reflector());

    await expect(guard.canActivate(wsContext({ handshake: { headers: { cookie: 'theme=dark; kiban_session=socket-token' } } }))).resolves.toBe(true);

    expect(auth.me).toHaveBeenCalledWith('socket-token');
  });
});
