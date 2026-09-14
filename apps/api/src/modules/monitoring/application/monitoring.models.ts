import type { SystemMetrics } from '../../system/application/system-metrics.service';
import type { FleetRuntimeStats, FleetRuntimeUnitStats } from '../../service/interfaces/fleet-runtime-stats';

/** Runtime stats shapes as reported by Kiban's active runtime backend. */
export type FleetStats = FleetRuntimeStats;
export type { FleetRuntimeUnitStats };

/** Scope of a monitoring sample or metric. */
export type MonitoringScope = 'host' | 'service';

/** Runtime monitoring metrics for one installed service. */
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

/** A currently active alert derived from live monitoring data. */
export interface MonitoringAlert {
  readonly id: string;
  readonly scope: MonitoringScope;
  readonly resourceId: string;
  readonly resourceName: string;
  readonly severity: 'warning' | 'critical';
  readonly message: string;
}

/** Full monitoring overview served to the Monitoring page. */
export interface MonitoringOverview {
  readonly host: SystemMetrics;
  readonly services: readonly ServiceRuntimeMetrics[];
  readonly alerts: readonly MonitoringAlert[];
  readonly runtimeAvailable: boolean;
}

/** One captured monitoring measurement. */
export interface MonitoringSample {
  readonly capturedAt: Date;
  readonly cpuPercent: number | null;
  readonly memoryUsedBytes: number | null;
  readonly memoryLimitBytes: number | null;
  readonly diskUsedBytes: number | null;
  readonly diskLimitBytes: number | null;
  readonly networkRxBytes: number | null;
  readonly networkTxBytes: number | null;
}

/** Input for persisting one monitoring measurement. */
export interface MonitoringSampleInput extends MonitoringSample {
  readonly scope: MonitoringScope;
  readonly resourceId: string;
}

/** A time series of monitoring samples for one scope and resource. */
export interface MonitoringHistory {
  readonly scope: MonitoringScope;
  readonly resourceId: string;
  readonly samples: readonly MonitoringSample[];
}
