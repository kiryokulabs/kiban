import type { HttpClient } from '@angular/common/http';
import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { SystemMetricsService } from './system-metrics.service';

interface HttpCall { readonly method: string; readonly url: string; readonly options?: unknown; }

const createHttpClient = (response: unknown) => {
  const calls: HttpCall[] = [];
  const http = {
    get: vi.fn((url: string, options?: unknown) => { calls.push({ method: 'GET', url, options }); return of(response); })
  };
  return { http: http as unknown as HttpClient, calls };
};

describe('Web SystemMetricsService', () => {
  it('loads system metrics with credentials', () => {
    const response = { memory: { totalBytes: 1, usedBytes: 1, freeBytes: 0, usagePercent: 100 }, disk: { totalBytes: 1, usedBytes: 0, freeBytes: 1, usagePercent: 0 }, cpu: { usagePercent: 12 }, network: { localIp: '192.168.1.25' } };
    const { http, calls } = createHttpClient(response);
    const service = new SystemMetricsService(http);

    service.getMetrics().subscribe();

    expect(calls).toEqual([{ method: 'GET', url: '/api/system/metrics', options: { withCredentials: true } }]);
  });
});
