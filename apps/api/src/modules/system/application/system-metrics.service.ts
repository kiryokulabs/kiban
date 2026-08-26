import { Inject, Injectable } from '@nestjs/common';

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

export interface SystemMetricsProvider {
  getMetrics(): Promise<SystemMetrics>;
}

export const SYSTEM_METRICS_PROVIDER = Symbol('SYSTEM_METRICS_PROVIDER');

@Injectable()
export class SystemMetricsService {
  public constructor(@Inject(SYSTEM_METRICS_PROVIDER) private readonly provider: SystemMetricsProvider) {}

  /** Returns host resource metrics for the Kiban installation. */
  public async getMetrics(): Promise<SystemMetrics> {
    return this.provider.getMetrics();
  }
}
