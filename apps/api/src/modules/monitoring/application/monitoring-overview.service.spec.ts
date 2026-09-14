import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstalledService, InstalledServiceManager } from '@kiban/core';
import { SystemMetricsService, type SystemMetrics } from '../../system/application/system-metrics.service';
import { MonitoringOverviewService } from './monitoring-overview.service';
import type { FleetStats } from './monitoring.models';

const hostMetrics = (cpuPercent: number): SystemMetrics => ({
  memory: { totalBytes: 16_000, usedBytes: 8_000, freeBytes: 8_000, usagePercent: 50 },
  disk: { totalBytes: 100_000, usedBytes: 40_000, freeBytes: 60_000, usagePercent: 40 },
  cpu: { usagePercent: cpuPercent },
  network: { localIp: '10.0.0.20' }
});

const installedService = (): InstalledService => ({
  id: 'service-1',
  environmentId: 'env-1',
  serviceId: 'postgres',
  name: 'PostgreSQL',
  status: 'running',
  configuration: {},
  runtime: { projectName: 'kiban-env-1-postgres' },
  createdAt: new Date('2026-09-01T10:00:00.000Z'),
  updatedAt: new Date('2026-09-10T10:00:00.000Z')
});

const fleetStats = (available: boolean): FleetStats => ({
  available,
  message: available ? null : 'Runtime stats are unavailable.',
  units: available
    ? [{ runtimeUnitId: 'abc123', runtimeUnitName: 'kiban-env-1-postgres-1', projectName: 'kiban-env-1-postgres', state: 'running', health: 'healthy', cpuPercent: 1.5, memoryUsedBytes: 100, memoryLimitBytes: 1000, networkRxBytes: 10, networkTxBytes: 20, restartCount: 0, startedAt: '2026-09-10T09:00:00.000Z' }]
    : []
});

interface OverviewHarness {
  readonly service: MonitoringOverviewService;
  readonly fleet: { getFleetStats: ReturnType<typeof vi.fn> };
}

const createHarness = (options: { readonly fleetStats?: FleetStats; readonly cpuPercent?: number } = {}): OverviewHarness => {
  const metrics = new SystemMetricsService({ getMetrics: async () => hostMetrics(options.cpuPercent ?? 12) });
  const services = { listAll: vi.fn(async () => [installedService()]) } as unknown as InstalledServiceManager;
  const fleet = { getFleetStats: vi.fn(async () => options.fleetStats ?? fleetStats(true)) };
  const service = new MonitoringOverviewService(metrics, services, fleet);
  return { service, fleet };
};

describe('MonitoringOverviewService', () => {
  it('composes host metrics, service metrics and alerts into one overview', async () => {
    const { service } = createHarness();

    const overview = await service.getOverview();

    expect(overview.host.cpu.usagePercent).toBe(12);
    expect(overview.runtimeAvailable).toBe(true);
    expect(overview.services).toHaveLength(1);
    expect(overview.services[0]!.name).toBe('PostgreSQL');
    expect(overview.services[0]!.cpuPercent).toBe(1.5);
    expect(overview.alerts).toEqual([]);
  });

  it('returns an empty service list when nothing is installed', async () => {
    const metrics = new SystemMetricsService({ getMetrics: async () => hostMetrics(12) });
    const services = { listAll: vi.fn(async () => []) } as unknown as InstalledServiceManager;
    const fleet = { getFleetStats: vi.fn(async () => fleetStats(true)) };
    const service = new MonitoringOverviewService(metrics, services, fleet);

    const overview = await service.getOverview();

    expect(overview.services).toEqual([]);
    expect(overview.alerts).toEqual([]);
  });

  it('flags the runtime as unavailable and nulls service stats when the fleet is unreachable', async () => {
    const { service } = createHarness({ fleetStats: fleetStats(false) });

    const overview = await service.getOverview();

    expect(overview.runtimeAvailable).toBe(false);
    expect(overview.services[0]!.cpuPercent).toBeNull();
    expect(overview.services[0]!.containerCount).toBe(0);
  });

  it('includes alerts raised from live data', async () => {
    const { service } = createHarness({ cpuPercent: 95 });

    const overview = await service.getOverview();

    expect(overview.alerts.map((alert) => alert.id)).toEqual(['host-cpu']);
  });
});

describe('MonitoringOverviewService fleet cache', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('reuses cached fleet stats within the cache window', async () => {
    vi.setSystemTime(new Date('2026-09-10T10:00:00.000Z'));
    const { service, fleet } = createHarness();

    await service.getOverview();
    await service.getOverview();

    expect(fleet.getFleetStats).toHaveBeenCalledTimes(1);
  });

  it('refreshes fleet stats after the cache window expires', async () => {
    vi.setSystemTime(new Date('2026-09-10T10:00:00.000Z'));
    const { service, fleet } = createHarness();

    await service.getOverview();
    vi.setSystemTime(new Date('2026-09-10T10:00:05.000Z'));
    await service.getOverview();
    vi.setSystemTime(new Date('2026-09-10T10:00:30.000Z'));
    await service.getOverview();

    expect(fleet.getFleetStats).toHaveBeenCalledTimes(2);
  });
});
