import type { HttpClient } from '@angular/common/http';
import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { UsersService } from './users.service';

interface HttpCall { readonly method: string; readonly url: string; readonly body?: unknown; readonly options?: unknown; }

const createHttpClient = (response: unknown) => {
  const calls: HttpCall[] = [];
  const http = {
    get: vi.fn((url: string, options?: unknown) => { calls.push({ method: 'GET', url, options }); return of(response); }),
    post: vi.fn((url: string, body: unknown, options?: unknown) => { calls.push({ method: 'POST', url, body, options }); return of(response); }),
    delete: vi.fn((url: string, options?: unknown) => { calls.push({ method: 'DELETE', url, options }); return of(response); })
  };
  return { http: http as unknown as HttpClient, calls };
};

describe('Web UsersService', () => {
  it('lists users with credentials', () => {
    const users = [{ id: 'admin-1', email: 'admin@example.com', role: 'admin' }];
    const { http, calls } = createHttpClient(users);
    const service = new UsersService(http);
    let result: unknown;

    service.listUsers().subscribe((value) => { result = value; });

    expect(result).toEqual(users);
    expect(calls).toEqual([{ method: 'GET', url: '/api/users', options: { withCredentials: true } }]);
  });

  it('creates an operator with credentials', () => {
    const payload = { email: 'operator@example.com', password: 'password123' };
    const operator = { id: 'operator-1', email: payload.email, role: 'operator' };
    const { http, calls } = createHttpClient(operator);
    const service = new UsersService(http);
    let result: unknown;

    service.createOperator(payload).subscribe((value) => { result = value; });

    expect(result).toEqual(operator);
    expect(calls).toEqual([{ method: 'POST', url: '/api/users/operators', body: payload, options: { withCredentials: true } }]);
  });

  it('deletes a user with credentials', () => {
    const { http, calls } = createHttpClient(null);
    const service = new UsersService(http);

    service.deleteUser('operator-1').subscribe();

    expect(calls).toEqual([{ method: 'DELETE', url: '/api/users/operator-1', options: { withCredentials: true } }]);
  });
});
