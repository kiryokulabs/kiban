import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';

export interface ResourceUsageMetrics {
  readonly totalBytes: number;
  readonly usedBytes: number;
  readonly freeBytes: number;
  readonly usagePercent: number;
}

export interface CpuUsageMetrics {
  readonly usagePercent: number;
}

export interface NetworkMetrics {
  readonly localIp: string | null;
}

export interface SystemMetrics {
  readonly memory: ResourceUsageMetrics;
  readonly disk: ResourceUsageMetrics;
  readonly cpu: CpuUsageMetrics;
  readonly network: NetworkMetrics;
}

@Injectable({ providedIn: 'root' })
export class SystemMetricsService {
  public constructor(private readonly http: HttpClient) {}

  /** Loads host resource metrics reported by the Kiban API. */
  public getMetrics(): Observable<SystemMetrics> {
    return this.http.get<SystemMetrics>('/api/system/metrics', { withCredentials: true });
  }
}
