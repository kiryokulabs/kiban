import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { InstallServiceRequest, InstalledService } from './installed-services.models';

@Injectable({ providedIn: 'root' })
export class InstalledServicesService {
  private readonly apiUrl = 'http://localhost:3000';
  public constructor(private readonly http: HttpClient) {}
  /** Lists every installed service. */
  public listAll(): Observable<readonly InstalledService[]> { return this.http.get<readonly InstalledService[]>(`${this.apiUrl}/services`, { withCredentials: true }); }
  /** Lists services installed in an environment. */
  public list(projectId: string, environmentId: string): Observable<readonly InstalledService[]> { return this.http.get<readonly InstalledService[]>(`${this.apiUrl}/projects/${projectId}/environments/${environmentId}/services`, { withCredentials: true }); }
  /** Installs a catalog service in an environment. */
  public install(projectId: string, environmentId: string, request: InstallServiceRequest): Observable<InstalledService> { return this.http.post<InstalledService>(`${this.apiUrl}/projects/${projectId}/environments/${environmentId}/services`, request, { withCredentials: true }); }
  /** Starts an installed service. */
  public start(id: string): Observable<InstalledService> { return this.http.patch<InstalledService>(`${this.apiUrl}/services/${id}/start`, {}, { withCredentials: true }); }
  /** Stops an installed service. */
  public stop(id: string): Observable<InstalledService> { return this.http.patch<InstalledService>(`${this.apiUrl}/services/${id}/stop`, {}, { withCredentials: true }); }
  /** Restarts an installed service. */
  public restart(id: string): Observable<InstalledService> { return this.http.patch<InstalledService>(`${this.apiUrl}/services/${id}/restart`, {}, { withCredentials: true }); }
  /** Deletes an installed service record. */
  public delete(id: string): Observable<void> { return this.http.delete<void>(`${this.apiUrl}/services/${id}`, { withCredentials: true }); }
}
