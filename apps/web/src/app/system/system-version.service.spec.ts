import type { HttpClient } from '@angular/common/http';
import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { SystemVersionService } from './system-version.service';

interface HttpCall { readonly method: string; readonly url: string; readonly options?: unknown; }

const createHttpClient = (response: unknown) => {
  const calls: HttpCall[] = [];
  const http = {
    get: vi.fn((url: string, options?: unknown) => { calls.push({ method: 'GET', url, options }); return of(response); })
  };
  return { http: http as unknown as HttpClient, calls };
};

describe('Web SystemVersionService', () => {
  it('loads version status with credentials', () => {
    const response = { currentVersion: '0.2.0', latestVersion: '0.2.1', updateAvailable: true, checkedAt: 'now' };
    const { http, calls } = createHttpClient(response);
    const service = new SystemVersionService(http);

    service.getVersion().subscribe();

    expect(calls).toEqual([{ method: 'GET', url: '/api/system/version', options: { withCredentials: true } }]);
  });
});
