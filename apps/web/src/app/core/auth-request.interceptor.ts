import type { HttpInterceptorFn } from '@angular/common/http';

/** Marks only same-origin Kiban API calls; other origins cannot preflight this header. */
export const authRequestInterceptor: HttpInterceptorFn = (request, next) => {
  return next(request.url.startsWith('/api/') ? request.clone({ setHeaders: { 'X-Kiban-Request': '1' } }) : request);
};
