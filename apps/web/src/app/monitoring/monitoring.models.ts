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

export interface HostMetrics {
  readonly memory: ResourceUsageMetrics;
  readonly disk: ResourceUsageMetrics;
  readonly cpu: CpuUsageMetrics;
  readonly network: NetworkMetrics;
}

export interface ServiceRuntimeMetrics {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly health: 'healthy' | 'unhealthy' | 'starting' | 'unknown';
  readonly cpuPercent: number | null;
  readonly memoryUsedBytes: number | null;
  readonly memoryLimitBytes: number | null;
  readonly networkRxBytes: number | null;
  readonly networkTxBytes: number | null;
  readonly restartCount: number;
  readonly uptimeSeconds: number | null;
  readonly containerCount: number;
  readonly runningContainers: number;
  readonly updatedAt: string;
}

export interface MonitoringAlert {
  readonly id: string;
  readonly scope: 'host' | 'service';
  readonly resourceId: string;
  readonly resourceName: string;
  readonly severity: 'warning' | 'critical';
  readonly message: string;
}

export interface MonitoringOverview {
  readonly host: HostMetrics;
  readonly services: readonly ServiceRuntimeMetrics[];
  readonly alerts: readonly MonitoringAlert[];
  readonly runtimeAvailable: boolean;
}

export interface MonitoringSample {
  readonly capturedAt: string;
  readonly cpuPercent: number | null;
  readonly memoryUsedBytes: number | null;
  readonly memoryLimitBytes: number | null;
  readonly diskUsedBytes: number | null;
  readonly diskLimitBytes: number | null;
  readonly networkRxBytes: number | null;
  readonly networkTxBytes: number | null;
}

export interface MonitoringHistory {
  readonly scope: 'host' | 'service';
  readonly resourceId: string;
  readonly samples: readonly MonitoringSample[];
}
