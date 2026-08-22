import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

export interface InstanceDomainResponse {
  readonly domain: string | null;
}

export interface TraefikPort {
  readonly published: number;
  readonly target: number;
}

export interface TraefikEntrypoint {
  readonly name: string;
  readonly address: string;
}

export interface TraefikRouter {
  readonly name: string;
  readonly rule: string;
  readonly entrypoint: string;
  readonly service: string;
  readonly port: string;
  readonly container: string;
}

export interface TraefikInfo {
  readonly status: 'running' | 'stopped' | 'not-installed';
  readonly version: string | null;
  readonly ports: readonly TraefikPort[];
  readonly entrypoints: readonly TraefikEntrypoint[];
  readonly dockerNetwork: string | null;
  readonly dashboard: boolean;
  readonly routers: readonly TraefikRouter[];
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

  /** Returns Traefik reverse proxy information and active routers. */
  public getTraefikInfo(): Observable<TraefikInfo> {
    return this.http.get<TraefikInfo>(`${this.apiUrl}/settings/traefik`, { withCredentials: true });
  }
}
