import type { InstalledService } from '@kiban/core';
import type { SystemMetrics } from '../../system/application/system-metrics.service';
import type { FleetStats, MonitoringSampleInput, ServiceRuntimeMetrics } from './monitoring.models';

const sumDefined = (values: readonly (number | null)[]): number | null => {
  const defined = values.filter((value): value is number => value !== null);
  return defined.length > 0 ? defined.reduce((total, value) => total + value, 0) : null;
};

const serviceHealth = (healths: readonly string[]): ServiceRuntimeMetrics['health'] => {
  if (healths.length === 0) return 'unknown';
  if (healths.includes('unhealthy')) return 'unhealthy';
  if (healths.every((health) => health === 'healthy')) return 'healthy';
  if (healths.includes('starting')) return 'starting';
  return 'unknown';
};

const serviceProjectName = (service: InstalledService): string | null => {
  const value = service.runtime?.['projectName'];
  return typeof value === 'string' && value.length > 0 ? value : null;
};

const uptimeSeconds = (startedAt: readonly (string | null)[], now: Date): number | null => {
  const started = startedAt.filter((value): value is string => value !== null).map((value) => Date.parse(value)).filter((parsed) => Number.isFinite(parsed));
  if (started.length === 0) return null;
  const earliest = Math.min(...started);
  const seconds = Math.floor((now.getTime() - earliest) / 1000);
  return seconds >= 0 ? seconds : null;
};

/** Maps installed services plus fleet stats to per-service runtime metrics. */
export const mapServiceRuntimeMetrics = (services: readonly InstalledService[], fleet: FleetStats, now: Date): readonly ServiceRuntimeMetrics[] => {
  return services.map((service) => {
    const projectName = serviceProjectName(service);
    const units = projectName && fleet.available ? fleet.units.filter((unit) => unit.projectName === projectName) : [];
    const running = units.filter((unit) => unit.state === 'running');
    return {
      id: service.id,
      name: service.name,
      status: service.status,
      health: serviceHealth(units.map((unit) => unit.health)),
      cpuPercent: sumDefined(units.map((unit) => unit.cpuPercent)),
      memoryUsedBytes: sumDefined(units.map((unit) => unit.memoryUsedBytes)),
      memoryLimitBytes: sumDefined(units.map((unit) => unit.memoryLimitBytes)),
      networkRxBytes: sumDefined(units.map((unit) => unit.networkRxBytes)),
      networkTxBytes: sumDefined(units.map((unit) => unit.networkTxBytes)),
      restartCount: units.reduce((total, unit) => total + (unit.restartCount ?? 0), 0),
      uptimeSeconds: uptimeSeconds(running.map((unit) => unit.startedAt), now),
      containerCount: units.length,
      runningContainers: running.length,
      updatedAt: service.updatedAt.toISOString()
    };
  });
};

/** Maps host system metrics to a host monitoring sample. */
export const hostMonitoringSample = (metrics: SystemMetrics, capturedAt: Date): MonitoringSampleInput => ({
  scope: 'host',
  resourceId: 'host',
  capturedAt,
  cpuPercent: metrics.cpu.usagePercent,
  memoryUsedBytes: metrics.memory.usedBytes,
  memoryLimitBytes: metrics.memory.totalBytes,
  diskUsedBytes: metrics.disk.usedBytes,
  diskLimitBytes: metrics.disk.totalBytes,
  networkRxBytes: null,
  networkTxBytes: null
});

/** Maps per-service runtime metrics to service monitoring samples. */
export const serviceMonitoringSamples = (metrics: readonly ServiceRuntimeMetrics[], capturedAt: Date): readonly MonitoringSampleInput[] => {
  return metrics.map((service): MonitoringSampleInput => ({
    scope: 'service',
    resourceId: service.id,
    capturedAt,
    cpuPercent: service.cpuPercent,
    memoryUsedBytes: service.memoryUsedBytes,
    memoryLimitBytes: service.memoryLimitBytes,
    diskUsedBytes: null,
    diskLimitBytes: null,
    networkRxBytes: service.networkRxBytes,
    networkTxBytes: service.networkTxBytes
  }));
};
