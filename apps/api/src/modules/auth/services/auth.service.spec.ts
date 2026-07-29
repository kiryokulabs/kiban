import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AdminRegistrationClosedError, AuthManager, InvalidCredentialsError, UnauthenticatedError } from '@kiban/core';
import { AUTH_MANAGER } from '../interfaces/auth.constants';
import { AuthService } from './auth.service';

const user = { id: 'user-1', email: 'admin@example.com', role: 'admin' as const };

const createService = (manager: Partial<AuthManager>) => new AuthService(manager as AuthManager);

describe('API AuthService', () => {
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
});
