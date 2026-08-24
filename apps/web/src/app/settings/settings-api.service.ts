import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

export interface InstanceDomainResponse {
  readonly domain: string | null;
}

export interface WildcardDomainResponse {
  readonly domain: string | null;
}

export interface InstallationTypeResponse {
  readonly type: 'local' | 'remote';
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

  /** Returns the configured wildcard domain for service URLs, or null when not set. */
  public getWildcardDomain(): Observable<WildcardDomainResponse> {
    return this.http.get<WildcardDomainResponse>(`${this.apiUrl}/settings/wildcard-domain`, { withCredentials: true });
  }

  /** Saves the wildcard domain used for generated service URLs. */
  public setWildcardDomain(domain: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/settings/wildcard-domain`, { domain }, { withCredentials: true });
  }

  /** Returns the installation type (local or remote). */
  public getInstallationType(): Observable<InstallationTypeResponse> {
    return this.http.get<InstallationTypeResponse>(`${this.apiUrl}/settings/installation-type`, { withCredentials: true });
  }

  /** Saves the installation type. */
  public setInstallationType(type: 'local' | 'remote'): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/settings/installation-type`, { type }, { withCredentials: true });
  }

  /** Returns Traefik reverse proxy information and active routers. */
  public getTraefikInfo(): Observable<TraefikInfo> {
    return this.http.get<TraefikInfo>(`${this.apiUrl}/settings/traefik`, { withCredentials: true });
  }
}
