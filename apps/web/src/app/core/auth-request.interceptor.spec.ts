import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { authRequestInterceptor } from './auth-request.interceptor';

describe('Same-origin API request protection', () => {
  it.each(['/api/auth/login', '/api/projects', '/api/auth/change-password'])('marks Kiban requests for backend CSRF checks', (url) => {
    const request = new HttpRequest('POST', url, {});
    runInInjectionContext(Injector.create({ providers: [] }), () => authRequestInterceptor(request, (sent) => {
      expect(sent.headers.get('X-Kiban-Request')).toBe('1');
      return of(new HttpResponse());
    })).subscribe();
  });
  it('does not add the header to external URLs', () => {
    authRequestInterceptor(new HttpRequest('POST', 'https://external.example/api', {}), (sent) => {
      expect(sent.headers.has('X-Kiban-Request')).toBe(false);
      return of(new HttpResponse());
    }).subscribe();
  });
});
