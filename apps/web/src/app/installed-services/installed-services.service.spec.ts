import type { HttpClient } from '@angular/common/http';
import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { InstalledServicesService } from './installed-services.service';
interface HttpCall { readonly method: string; readonly url: string; readonly body?: unknown; readonly options?: unknown; }
const createHttpClient = () => { const calls: HttpCall[] = []; const http = { get: vi.fn((url: string, options?: unknown) => { calls.push({ method: 'GET', url, options }); return of([]); }), post: vi.fn((url: string, body: unknown, options?: unknown) => { calls.push({ method: 'POST', url, body, options }); return of({ id: 'service-1' }); }), patch: vi.fn((url: string, body: unknown, options?: unknown) => { calls.push({ method: 'PATCH', url, body, options }); return of({ id: 'service-1' }); }), delete: vi.fn((url: string, options?: unknown) => { calls.push({ method: 'DELETE', url, options }); return of(null); }) }; return { http: http as unknown as HttpClient, calls }; };
describe('InstalledServicesService', () => {
  it('installs services in an environment with credentials', () => { const { http, calls } = createHttpClient(); const service = new InstalledServicesService(http); const body = { serviceId: 'postgresql', configuration: {} }; service.install('project-1', 'env-1', body).subscribe(); expect(calls).toEqual([{ method: 'POST', url: 'http://localhost:3000/projects/project-1/environments/env-1/services', body, options: { withCredentials: true } }]); });
  it('starts services through generic service endpoint', () => { const { http, calls } = createHttpClient(); new InstalledServicesService(http).start('service-1').subscribe(); expect(calls).toEqual([{ method: 'PATCH', url: 'http://localhost:3000/services/service-1/start', body: {}, options: { withCredentials: true } }]); });
});
