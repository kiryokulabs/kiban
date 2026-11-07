import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AdminRegistrationClosedError, AuthManager, InvalidCredentialsError, UnauthenticatedError } from '@kiban/core';
import { AUTH_MANAGER } from '../interfaces/auth.constants';
import { AuthService } from './auth.service';
import type { LoginRateLimiter } from './login-rate-limiter';

const user = { id: 'user-1', email: 'admin@example.com', role: 'admin' as const };

const createService = (manager: Partial<AuthManager>) => {
  const now = new Date();
  const auth: Partial<AuthManager> = { authenticate: vi.fn(async () => ({ user: { ...user, passwordHash: 'hash', createdAt: now, updatedAt: now }, session: { id: 'session-1', userId: user.id, tokenHash: 'hash', createdAt: now, expiresAt: new Date(Date.now() + 60_000) } })), ...manager };
  const limiter: Pick<LoginRateLimiter, 'consume'> = { consume: vi.fn(async () => undefined) };
  return new AuthService(auth as AuthManager, limiter as LoginRateLimiter);
};

describe('API AuthService', () => {
  it('passes only the backend-observed IP into successful login processing', async () => {
    const login = vi.fn(async () => ({ token: 'token', expiresAt: new Date(), user: { ...user, passwordHash: 'hash', createdAt: new Date(), updatedAt: new Date() } }));
    const service = createService({ login });
    await service.login({ email: user.email, password: 'password123' }, '2001:db8::1');
    expect(login).toHaveBeenCalledWith({ email: user.email, password: 'password123', ipAddress: '2001:db8::1' });
    await expect(service.login({ email: user.email, password: 'password123', ipAddress: '198.51.100.1' }, '192.0.2.1')).rejects.toBeInstanceOf(BadRequestException);
    expect(login).toHaveBeenCalledTimes(1);
  });

  it('returns bootstrap status from core auth manager', async () => {
    const service = createService({ getBootstrapStatus: vi.fn(async () => ({ requiresAdminSetup: true })) });
    await expect(service.bootstrapStatus()).resolves.toEqual({ requiresAdminSetup: true });
  });

  it('registers initial admin', async () => {
    const service = createService({ registerInitialAdmin: vi.fn(async () => user) });
    await expect(service.registerAdmin({ email: 'admin@example.com', password: 'password123' })).resolves.toEqual({ user });
  });

  it('rejects invalid register payload', async () => {
    const service = createService({ registerInitialAdmin: vi.fn() });
    await expect(service.registerAdmin({ email: 'invalid', password: 'short' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps closed admin registration to bad request', async () => {
    const service = createService({ registerInitialAdmin: vi.fn(async () => { throw new AdminRegistrationClosedError(); }) });
    await expect(service.registerAdmin({ email: 'admin@example.com', password: 'password123' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('logs in and returns token/cookie payload information', async () => {
    const expiresAt = new Date('2026-07-29T12:00:00.000Z');
    const service = createService({ login: vi.fn(async () => ({ token: 'token', expiresAt, user: { ...user, passwordHash: 'hash', createdAt: expiresAt, updatedAt: expiresAt } })) });
    await expect(service.login({ email: 'admin@example.com', password: 'password123' })).resolves.toEqual({ token: 'token', expiresAt, response: { user } });
  });

  it('maps invalid login credentials to unauthorized', async () => {
    const service = createService({ login: vi.fn(async () => { throw new InvalidCredentialsError(); }) });
    await expect(service.login({ email: 'admin@example.com', password: 'password123' })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns current user from session token', async () => {
    const fullUser = { ...user, passwordHash: 'hash', createdAt: new Date(), updatedAt: new Date() };
    const service = createService({ authenticate: vi.fn(async () => ({ user: fullUser, session: { id: 'session-1', userId: user.id, tokenHash: 'hash', expiresAt: new Date(), createdAt: new Date() } })) });
    await expect(service.me('token')).resolves.toEqual({ user });
  });

  it('maps missing session to unauthorized', async () => {
    const service = createService({ authenticate: vi.fn(async () => { throw new UnauthenticatedError(); }) });
    await expect(service.me(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('changes password through core auth manager', async () => {
    const changePassword = vi.fn(async () => undefined);
    const service = createService({ changePassword });
    await service.changePassword('token', { currentPassword: 'password123', newPassword: 'new-password' });
    expect(changePassword).toHaveBeenCalledWith('token', { currentPassword: 'password123', newPassword: 'new-password' });
  });

  it('rejects short new password changes', async () => {
    const service = createService({ changePassword: vi.fn() });
    await expect(service.changePassword('token', { currentPassword: 'password123', newPassword: 'short' })).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each([null, {}, [], { email: 'admin@example.com' }, { email: 123, password: 'password123' }, { email: 'admin@example.com', password: 123 }])('rejects malformed login payloads as bad requests', async (payload) => {
    const service = createService({ login: vi.fn() });
    await expect(service.login(payload)).rejects.toBeInstanceOf(BadRequestException);
  });

});
