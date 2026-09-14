import { describe, expect, it } from 'vitest';
import type { InstalledService } from '@kiban/core';
import { hostMonitoringSample, mapServiceRuntimeMetrics, serviceMonitoringSamples } from './monitoring-metrics.mapper';
import type { FleetStats, FleetRuntimeUnitStats, MonitoringSampleInput } from './monitoring.models';
import type { SystemMetrics } from '../../system/application/system-metrics.service';

const installedService = (overrides: Partial<InstalledService> = {}): InstalledService => ({
  id: 'service-1',
  environmentId: 'env-1',
  serviceId: 'postgres',
  name: 'PostgreSQL',
  status: 'running',
  configuration: {},
  runtime: { projectName: 'kiban-env-1-postgres' },
  createdAt: new Date('2026-09-01T10:00:00.000Z'),
  updatedAt: new Date('2026-09-10T10:00:00.000Z'),
  ...overrides
});

const unit = (overrides: Partial<FleetRuntimeUnitStats> = {}): FleetRuntimeUnitStats => ({
  runtimeUnitId: 'abc123',
  runtimeUnitName: 'kiban-env-1-postgres-1',
  projectName: 'kiban-env-1-postgres',
  state: 'running',
  health: 'healthy',
  cpuPercent: 1.5,
  memoryUsedBytes: 100,
  memoryLimitBytes: 1000,
  networkRxBytes: 10,
  networkTxBytes: 20,
  restartCount: 2,
  startedAt: '2026-09-10T09:00:00.000Z',
  ...overrides
});

const fleet = (units: readonly FleetRuntimeUnitStats[], available = true): FleetStats => ({ units, available, message: available ? null : 'Runtime engine is not reachable.' });

const now = new Date('2026-09-10T10:00:00.000Z');

describe('mapServiceRuntimeMetrics', () => {
  it('maps an empty service list to an empty metrics list', () => {
    expect(mapServiceRuntimeMetrics([], fleet([]), now)).toEqual([]);
  });

  it('aggregates runtime stats of all containers of a service', () => {
    const units = [unit(), unit({ runtimeUnitId: 'def456', runtimeUnitName: 'kiban-env-1-postgres-2', cpuPercent: 0.5, memoryUsedBytes: 50, memoryLimitBytes: 500, networkRxBytes: 5, networkTxBytes: 7, restartCount: 1 })];

    const metrics = mapServiceRuntimeMetrics([installedService()], fleet(units), now);

    expect(metrics).toHaveLength(1);
    expect(metrics[0]!.id).toBe('service-1');
    expect(metrics[0]!.name).toBe('PostgreSQL');
    expect(metrics[0]!.status).toBe('running');
    expect(metrics[0]!.health).toBe('healthy');
    expect(metrics[0]!.cpuPercent).toBe(2);
    expect(metrics[0]!.memoryUsedBytes).toBe(150);
    expect(metrics[0]!.memoryLimitBytes).toBe(1500);
    expect(metrics[0]!.networkRxBytes).toBe(15);
    expect(metrics[0]!.networkTxBytes).toBe(27);
    expect(metrics[0]!.restartCount).toBe(3);
    expect(metrics[0]!.containerCount).toBe(2);
    expect(metrics[0]!.runningContainers).toBe(2);
    expect(metrics[0]!.uptimeSeconds).toBe(3600);
    expect(metrics[0]!.updatedAt).toBe('2026-09-10T10:00:00.000Z');
  });

  it('ignores containers that belong to other projects', () => {
    const units = [unit(), unit({ runtimeUnitId: 'other', runtimeUnitName: 'other-1', projectName: 'kiban-env-2-other' })];

    const metrics = mapServiceRuntimeMetrics([installedService()], fleet(units), now);

    expect(metrics[0]!.containerCount).toBe(1);
    expect(metrics[0]!.cpuPercent).toBe(1.5);
  });

  it('reports null stats for a service without runtime metadata', () => {
    const metrics = mapServiceRuntimeMetrics([installedService({ runtime: null })], fleet([unit()]), now);

    expect(metrics[0]!.cpuPercent).toBeNull();
    expect(metrics[0]!.memoryUsedBytes).toBeNull();
    expect(metrics[0]!.containerCount).toBe(0);
    expect(metrics[0]!.runningContainers).toBe(0);
    expect(metrics[0]!.restartCount).toBe(0);
    expect(metrics[0]!.uptimeSeconds).toBeNull();
    expect(metrics[0]!.health).toBe('unknown');
  });

  it('reports null stats when the runtime engine is unavailable', () => {
    const metrics = mapServiceRuntimeMetrics([installedService()], fleet([], false), now);

    expect(metrics[0]!.cpuPercent).toBeNull();
    expect(metrics[0]!.containerCount).toBe(0);
  });

  it('marks a service unhealthy when any container is unhealthy', () => {
    const units = [unit(), unit({ runtimeUnitId: 'def456', runtimeUnitName: 'kiban-env-1-postgres-2', health: 'unhealthy' })];

    const metrics = mapServiceRuntimeMetrics([installedService()], fleet(units), now);

    expect(metrics[0]!.health).toBe('unhealthy');
  });

  it('marks a service health unknown when containers expose no health signal', () => {
    const units = [unit({ health: 'unknown' })];

    const metrics = mapServiceRuntimeMetrics([installedService()], fleet(units), now);

    expect(metrics[0]!.health).toBe('unknown');
  });

  it('counts only running containers for uptime and running state', () => {
    const units = [unit(), unit({ runtimeUnitId: 'def456', runtimeUnitName: 'kiban-env-1-postgres-2', state: 'exited', startedAt: null, cpuPercent: null, memoryUsedBytes: 0, memoryLimitBytes: 0, networkRxBytes: 0, networkTxBytes: 0 })];

    const metrics = mapServiceRuntimeMetrics([installedService()], fleet(units), now);

    expect(metrics[0]!.runningContainers).toBe(1);
    expect(metrics[0]!.uptimeSeconds).toBe(3600);
  });

  it('sums only non-null cpu values', () => {
    const units = [unit({ cpuPercent: null }), unit({ runtimeUnitId: 'def456', runtimeUnitName: 'kiban-env-1-postgres-2', cpuPercent: 3 })];

    const metrics = mapServiceRuntimeMetrics([installedService()], fleet(units), now);

    expect(metrics[0]!.cpuPercent).toBe(3);
  });
});

describe('hostMonitoringSample', () => {
  it('maps host metrics to a host monitoring sample', () => {
    const metrics: SystemMetrics = {
      memory: { totalBytes: 16_000, usedBytes: 8_000, freeBytes: 8_000, usagePercent: 50 },
      disk: { totalBytes: 100_000, usedBytes: 40_000, freeBytes: 60_000, usagePercent: 40 },
      cpu: { usagePercent: 12 },
      network: { localIp: '10.0.0.20' }
    };

    const sample = hostMonitoringSample(metrics, now);

    expect(sample).toEqual({
      scope: 'host',
      resourceId: 'host',
      capturedAt: now,
      cpuPercent: 12,
      memoryUsedBytes: 8_000,
      memoryLimitBytes: 16_000,
      diskUsedBytes: 40_000,
      diskLimitBytes: 100_000,
      networkRxBytes: null,
      networkTxBytes: null
    });
  });
});

describe('serviceMonitoringSamples', () => {
  it('maps service metrics to service monitoring samples', () => {
    const metrics = mapServiceRuntimeMetrics([installedService()], fleet([unit()]), now);

    const samples = serviceMonitoringSamples(metrics, now);

    expect(samples).toHaveLength(1);
    expect(samples[0]).toEqual({
      scope: 'service',
      resourceId: 'service-1',
      capturedAt: now,
      cpuPercent: 1.5,
      memoryUsedBytes: 100,
      memoryLimitBytes: 1000,
      diskUsedBytes: null,
      diskLimitBytes: null,
      networkRxBytes: 10,
      networkTxBytes: 20
    } satisfies MonitoringSampleInput);
  });
});
