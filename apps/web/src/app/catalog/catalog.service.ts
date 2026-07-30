import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { CatalogResponse } from './catalog.models';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly apiUrl = 'http://localhost:3000';

  public constructor(private readonly http: HttpClient) {}

  /** Lists all data-driven catalog categories and services. */
  public list(query?: string): Observable<CatalogResponse> {
    const search = query?.trim();
    const suffix = search ? `?q=${encodeURIComponent(search)}` : '';
    return this.http.get<CatalogResponse>(`${this.apiUrl}/catalog${suffix}`, { withCredentials: true });
  }
}
