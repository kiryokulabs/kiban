import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from './loading.service';

export const httpLoadingInterceptor: HttpInterceptorFn = (_req, next) => {
  const loading = inject(LoadingService);
  loading.start();
  return next(_req).pipe(finalize(() => loading.stop()));
};
