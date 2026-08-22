import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

export interface InstanceDomainResponse {
  readonly domain: string | null;
}

@Injectable({ providedIn: 'root' })
export class SettingsApiService {
  private readonly apiUrl = '/api';

  public constructor(private readonly http: HttpClient) {}

  /** Returns the configured instance domain, or null when not set. */
  public getInstanceDomain(): Observable<InstanceDomainResponse> {
    return this.http.get<InstanceDomainResponse>(`${this.apiUrl}/settings/domain`, { withCredentials: true });
  }

  /** Saves the instance domain. */
  public setInstanceDomain(domain: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/settings/domain`, { domain }, { withCredentials: true });
  }
}
