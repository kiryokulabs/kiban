import type { HttpClient } from '@angular/common/http';
import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { MonitoringApiService } from './monitoring-api.service';

interface HttpCall { readonly method: string; readonly url: string; readonly options?: unknown; }

const createHttpClient = (response: unknown) => {
  const calls: HttpCall[] = [];
  const http = {
    get: vi.fn((url: string, options?: unknown) => { calls.push({ method: 'GET', url, options }); return of(response); })
  };
  return { http: http as unknown as HttpClient, calls };
};

describe('MonitoringApiService', () => {
  it('loads the monitoring overview with credentials', () => {
    const { http, calls } = createHttpClient({ host: null, services: [], alerts: [], runtimeAvailable: true });
    const service = new MonitoringApiService(http);

    service.overview().subscribe();

    expect(calls).toEqual([{ method: 'GET', url: '/api/monitoring/overview', options: { withCredentials: true } }]);
  });

  it('loads host history with scope, resource and range parameters', () => {
    const { http, calls } = createHttpClient({ scope: 'host', resourceId: 'host', samples: [] });
    const service = new MonitoringApiService(http);

    service.history('host', 'host', 24).subscribe();

    expect(calls).toEqual([{ method: 'GET', url: '/api/monitoring/history?scope=host&resourceId=host&hours=24', options: { withCredentials: true } }]);
  });

  it('loads service history for a specific service resource', () => {
    const { http, calls } = createHttpClient({ scope: 'service', resourceId: 'service-1', samples: [] });
    const service = new MonitoringApiService(http);

    service.history('service', 'service-1', 48).subscribe();

    expect(calls[0]!.url).toBe('/api/monitoring/history?scope=service&resourceId=service-1&hours=48');
  });
});
