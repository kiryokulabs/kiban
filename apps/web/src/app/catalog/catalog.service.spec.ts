import type { HttpClient } from '@angular/common/http';
import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { CatalogService } from './catalog.service';

interface HttpCall { readonly url: string; readonly options?: unknown; }

const createHttpClient = () => {
  const calls: HttpCall[] = [];
  const http = { get: vi.fn((url: string, options?: unknown) => { calls.push({ url, options }); return of({ categories: [], items: [] }); }) };
  return { http: http as unknown as HttpClient, calls };
};

describe('Web CatalogService', () => {
  it('loads the catalog with credentials', () => {
    const { http, calls } = createHttpClient();
    const service = new CatalogService(http);

    service.list().subscribe();

    expect(calls).toEqual([{ url: '/api/catalog', options: { withCredentials: true } }]);
  });

  it('passes search query to the generic catalog endpoint', () => {
    const { http, calls } = createHttpClient();
    const service = new CatalogService(http);

    service.list('postgres sql').subscribe();

    expect(calls).toEqual([{ url: '/api/catalog?q=postgres%20sql', options: { withCredentials: true } }]);
  });
});
