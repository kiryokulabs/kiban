import type { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { LogsService } from './logs.service';

describe('Web LogsService', () => {
  it('loads Kiban platform logs from the API with credentials', () => {
    const calls: { readonly url: string; readonly options?: unknown }[] = [];
    const http = { get: vi.fn((url: string, options?: unknown) => { calls.push({ url, options }); return of({ available: true, logs: 'ready', message: null }); }) } as unknown as HttpClient;
    const service = new LogsService(http);
    let result: unknown;

    service.kiban().subscribe((value) => { result = value; });

    expect(result).toEqual({ available: true, logs: 'ready', message: null });
    expect(calls).toEqual([{ url: '/api/logs', options: { withCredentials: true } }]);
  });
});
