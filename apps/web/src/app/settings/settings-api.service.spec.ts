import type { HttpClient } from '@angular/common/http';
import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { SettingsApiService } from './settings-api.service';

interface HttpCall { readonly method: string; readonly url: string; readonly body?: unknown; readonly options?: unknown; }

const createHttpClient = (response: unknown) => {
  const calls: HttpCall[] = [];
  const http = {
    get: vi.fn((url: string, options?: unknown) => { calls.push({ method: 'GET', url, options }); return of(response); }),
    put: vi.fn((url: string, body: unknown, options?: unknown) => { calls.push({ method: 'PUT', url, body, options }); return of(response); })
  };
  return { http: http as unknown as HttpClient, calls };
};

describe('Web SettingsApiService', () => {
  it('loads TLS settings with credentials', () => {
    const response = { acmeEmail: 'ops@example.com', useStaging: true };
    const { http, calls } = createHttpClient(response);
    const service = new SettingsApiService(http);
    let result: unknown;

    service.getTlsSettings().subscribe((value) => { result = value; });

    expect(result).toEqual(response);
    expect(calls).toEqual([{ method: 'GET', url: '/api/settings/tls', options: { withCredentials: true } }]);
  });

  it('saves TLS settings with credentials', () => {
    const payload = { acmeEmail: 'security@example.com', useStaging: false };
    const { http, calls } = createHttpClient(null);
    const service = new SettingsApiService(http);

    service.setTlsSettings(payload).subscribe();

    expect(calls).toEqual([{ method: 'PUT', url: '/api/settings/tls', body: payload, options: { withCredentials: true } }]);
  });
});
