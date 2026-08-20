import type { HttpClient } from '@angular/common/http';
import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { AuthService } from './auth.service';

interface HttpCall { readonly method: string; readonly url: string; readonly body?: unknown; readonly options?: unknown; }

const createHttpClient = (responses: readonly unknown[]) => {
  const calls: HttpCall[] = [];
  const queue = [...responses];
  const next = () => of(queue.shift());
  const http = {
    get: vi.fn((url: string, options?: unknown) => { calls.push({ method: 'GET', url, options }); return next(); }),
    post: vi.fn((url: string, body: unknown, options?: unknown) => { calls.push({ method: 'POST', url, body, options }); return next(); })
  };
  return { http: http as unknown as HttpClient, calls };
};

describe('Web AuthService', () => {
  it('loads bootstrap status with credentials', () => {
    const { http, calls } = createHttpClient([{ requiresAdminSetup: true }]);
    const service = new AuthService(http);
    let result: unknown;

    service.bootstrapStatus().subscribe((value) => { result = value; });

    expect(result).toEqual({ requiresAdminSetup: true });
    expect(calls).toEqual([{ method: 'GET', url: '/api/auth/bootstrap-status', options: { withCredentials: true } }]);
  });

  it('registers admin by calling register endpoint and then login endpoint', () => {
    const credentials = { email: 'admin@example.com', password: 'password123' };
    const user = { id: 'admin-1', email: credentials.email, role: 'admin' };
    const { http, calls } = createHttpClient([{ user }, { user }]);
    const service = new AuthService(http);
    let result: unknown;

    service.registerAdmin(credentials).subscribe((value) => { result = value; });

    expect(result).toEqual({ user });
    expect(service.user()).toEqual(user);
    expect(service.isAuthenticated()).toBe(true);
    expect(calls).toEqual([
      { method: 'POST', url: '/api/auth/register-admin', body: credentials, options: { withCredentials: true } },
      { method: 'POST', url: '/api/auth/login', body: credentials, options: { withCredentials: true } }
    ]);
  });

  it('logs in and updates auth state', () => {
    const user = { id: 'operator-1', email: 'operator@example.com', role: 'operator' };
    const { http } = createHttpClient([{ user }]);
    const service = new AuthService(http);

    service.login({ email: 'operator@example.com', password: 'password123' }).subscribe();

    expect(service.user()).toEqual(user);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('restores current user through /auth/me', () => {
    const user = { id: 'admin-1', email: 'admin@example.com', role: 'admin' };
    const { http, calls } = createHttpClient([{ user }]);
    const service = new AuthService(http);

    service.me().subscribe();

    expect(service.user()).toEqual(user);
    expect(calls[0]).toEqual({ method: 'GET', url: '/api/auth/me', options: { withCredentials: true } });
  });

  it('clears auth state after password change', () => {
    const user = { id: 'admin-1', email: 'admin@example.com', role: 'admin' };
    const { http, calls } = createHttpClient([{ user }, null]);
    const service = new AuthService(http);
    service.login({ email: 'admin@example.com', password: 'password123' }).subscribe();

    service.changePassword({ currentPassword: 'password123', newPassword: 'new-password' }).subscribe();

    expect(service.user()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(calls[1]).toEqual({ method: 'POST', url: '/api/auth/change-password', body: { currentPassword: 'password123', newPassword: 'new-password' }, options: { withCredentials: true } });
  });

  it('clears auth state after logout', () => {
    const user = { id: 'admin-1', email: 'admin@example.com', role: 'admin' };
    const { http, calls } = createHttpClient([{ user }, null]);
    const service = new AuthService(http);
    service.login({ email: 'admin@example.com', password: 'password123' }).subscribe();

    service.logout().subscribe();

    expect(service.user()).toBeNull();
    expect(calls[1]).toEqual({ method: 'POST', url: '/api/auth/logout', body: {}, options: { withCredentials: true } });
  });
});
