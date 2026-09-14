import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { MonitoringHistory, MonitoringOverview } from './monitoring.models';

@Injectable({ providedIn: 'root' })
export class MonitoringApiService {
  private readonly apiUrl = '/api';

  public constructor(private readonly http: HttpClient) {}

  /** Loads the current monitoring overview for the Kiban installation. */
  public overview(): Observable<MonitoringOverview> {
    return this.http.get<MonitoringOverview>(`${this.apiUrl}/monitoring/overview`, { withCredentials: true });
  }

  /** Loads historical monitoring samples for one scope and resource. */
  public history(scope: 'host' | 'service', resourceId: string, hours: number): Observable<MonitoringHistory> {
    return this.http.get<MonitoringHistory>(`${this.apiUrl}/monitoring/history?scope=${scope}&resourceId=${encodeURIComponent(resourceId)}&hours=${hours}`, { withCredentials: true });
  }
}
