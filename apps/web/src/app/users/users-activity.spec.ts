import '@angular/compiler';
import { HttpClient, HttpResponse, type HttpBackend, type HttpRequest } from '@angular/common/http';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { UsersPageComponent } from '../pages/users-page.component';
import { ToastService } from '../shared/toast.service';
import { UsersService } from './users.service';

vi.mock('../shared/icons.component', () => ({ IconsComponent: class {} }));
vi.mock('../shared/confirm-modal.component', () => ({ ConfirmModalComponent: class {} }));

const users = [
  { id: 'admin', email: 'admin@example.com', role: 'admin' as const },
  { id: 'operator', email: 'operator@example.com', role: 'operator' as const }
];
const activity = [{ userId: 'admin', lastLoginAt: '2026-11-04T10:00:00Z', lastLoginIp: '192.0.2.1', activeSessions: 1, currentSession: { createdAt: '2026-11-04T10:00:00Z', expiresAt: '2026-11-05T10:00:00Z', ipAddress: '192.0.2.1' } }];
class TestUsersPage extends UsersPageComponent {
  public get adminActivity() { return this.activity().get('admin'); }
  public get accounts() { return this.users(); }
  public get activityFailure() { return this.activityError(); }
  public reload(): void { this.loadUsers(); }
}

const createPage = (fail = false) => {
  const api = { listUsers: vi.fn(() => of(users)), listActivity: vi.fn(() => fail ? throwError(() => new Error('failed')) : of(activity)) };
  const injector = Injector.create({ providers: [
    { provide: AuthService, useValue: { user: signal(users[0]) } },
    { provide: UsersService, useValue: api },
    { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } }
  ] });
  return { page: runInInjectionContext(injector, () => new TestUsersPage()), api };
};

describe('User login activity', () => {
  it('requests account activity using the session cookie, without caller-selected users', () => {
    const requests: HttpRequest<unknown>[] = [];
    const backend: HttpBackend = { handle: request => { requests.push(request); return of(new HttpResponse({ body: activity })); } };
    const api = new UsersService(new HttpClient(backend));
    api.listActivity().subscribe(value => expect(value).toEqual(activity));
    expect(requests[0]?.url).toBe('/api/users/activity');
    expect(requests[0]?.method).toBe('GET');
    expect(requests[0]?.withCredentials).toBe(true);
  });

  it('loads own and operator accounts alongside activity and refreshes both together', () => {
    const { page, api } = createPage();
    expect(page.accounts).toEqual(users);
    expect(page.adminActivity).toEqual(activity[0]);
    page.reload();
    expect(api.listActivity).toHaveBeenCalledTimes(2);
  });

  it('shows an activity error without losing accounts or presenting false session counts', () => {
    const { page } = createPage(true);
    expect(page.activityFailure).toBe(true);
    expect(page.adminActivity).toBeUndefined();
    expect(page.accounts).toEqual(users);
  });

  it('places activity beside accounts on desktop and distinguishes current sessions from online status', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/pages/users-page.component.ts'), 'utf8');
    expect(source).toContain('xl:grid-cols-');
    for (const label of ['Login activity', 'Last login', 'Login IP', 'Active sessions', 'Current session', 'Not recorded']) expect(source).toContain(label);
    expect(source).not.toMatch(/>Online</);
    expect(source).not.toContain('max-w-3xl');
  });
});
