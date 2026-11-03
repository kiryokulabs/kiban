import '@angular/compiler';
import { HttpClient, HttpResponse, type HttpBackend, type HttpRequest } from '@angular/common/http';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { SmtpSettingsApiService } from './smtp-settings-api.service';

describe('SMTP settings API client', () => {
  it('uses only dedicated SMTP endpoints with credentials', () => {
    const requests: HttpRequest<unknown>[] = [];
    const backend: HttpBackend = { handle: (request) => { requests.push(request); return of(new HttpResponse({ body: null })); } };
    const api = new SmtpSettingsApiService(new HttpClient(backend));
    const payload = { host: 'localhost', port: 1025, security: 'none' as const, username: '', fromName: 'Kiban', fromEmail: 'kiban@example.com' };
    api.get().subscribe();
    api.save(payload).subscribe();
    api.sendTest().subscribe();
    expect(requests.map((request) => ({ method: request.method, url: request.url, credentials: request.withCredentials }))).toEqual([
      { method: 'GET', url: '/api/notifications/smtp', credentials: true },
      { method: 'PUT', url: '/api/notifications/smtp', credentials: true },
      { method: 'POST', url: '/api/notifications/smtp/test', credentials: true }
    ]);
    expect(requests[1]?.body).toEqual(payload);
    expect(requests[2]?.body).toEqual({});
  });
});
