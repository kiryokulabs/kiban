import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InstalledService, InstalledServiceManager } from '@kiban/core';
import { SystemMetricsService, type SystemMetrics } from '../../system/application/system-metrics.service';
import { MonitoringSamplerService } from './monitoring-sampler.service';
import type { FleetStatsProvider } from './fleet-stats.provider';
import type { MonitoringRepository } from './monitoring-repository';
import type { FleetStats, MonitoringSampleInput } from './monitoring.models';

const hostMetrics: SystemMetrics = {
  memory: { totalBytes: 16_000, usedBytes: 8_000, freeBytes: 8_000, usagePercent: 50 },
  disk: { totalBytes: 100_000, usedBytes: 40_000, freeBytes: 60_000, usagePercent: 40 },
  cpu: { usagePercent: 12 },
  network: { localIp: '10.0.0.20' }
};

const installedService = (id: string, projectName: string | null): InstalledService => ({
  id,
  environmentId: 'env-1',
  serviceId: id,
  name: id,
  status: 'running',
  configuration: {},
  runtime: projectName ? { projectName } : null,
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

interface SamplerHarness {
  readonly sampler: MonitoringSamplerService;
  readonly inserted: MonitoringSampleInput[];
  readonly deletedBefore: Date[];
}

const createHarness = (options: { readonly available?: boolean; readonly metricsError?: boolean } = {}): SamplerHarness => {
  const inserted: MonitoringSampleInput[] = [];
  const deletedBefore: Date[] = [];
  const metrics = new SystemMetricsService({
    getMetrics: async (): Promise<SystemMetrics> => {
      if (options.metricsError) throw new Error('metrics unavailable');
      return hostMetrics;
    }
  });
  const services = { listAll: vi.fn(async () => [installedService('service-1', 'kiban-env-1-postgres'), installedService('service-2', null)]) } as unknown as InstalledServiceManager;
  const fleet = { getFleetStats: vi.fn(async () => fleetStats(options.available ?? true)) };
  const repository: MonitoringRepository = {
    insertSamples: vi.fn(async (samples: readonly MonitoringSampleInput[]) => { inserted.push(...samples); }),
    listHistory: vi.fn(async () => []),
    deleteOlderThan: vi.fn(async (cutoff: Date) => { deletedBefore.push(cutoff); })
  };
  const sampler = new MonitoringSamplerService(metrics, services, fleet, repository);
  return { sampler, inserted, deletedBefore };
};

describe('MonitoringSamplerService', () => {
  it('captures a host sample and one sample per running service', async () => {
    const { sampler, inserted } = createHarness();

    await sampler.sampleOnce();

    expect(inserted).toHaveLength(2);
    expect(inserted[0]!.scope).toBe('host');
    expect(inserted[0]!.resourceId).toBe('host');
    expect(inserted[0]!.cpuPercent).toBe(12);
    expect(inserted[1]!.scope).toBe('service');
    expect(inserted[1]!.resourceId).toBe('service-1');
    expect(inserted[1]!.cpuPercent).toBe(1.5);
  });

  it('skips service samples when the runtime engine is unavailable', async () => {
    const { sampler, inserted } = createHarness({ available: false });

    await sampler.sampleOnce();

    expect(inserted).toHaveLength(1);
    expect(inserted[0]!.scope).toBe('host');
  });

  it('never throws when capturing fails', async () => {
    const { sampler, inserted } = createHarness({ metricsError: true });

    await expect(sampler.sampleOnce()).resolves.toBeUndefined();
    expect(inserted).toHaveLength(0);
  });

  it('deletes samples older than the retention window', async () => {
    const { sampler, deletedBefore } = createHarness();

    await sampler.runRetention();

    expect(deletedBefore).toHaveLength(1);
    const cutoff = deletedBefore[0]!;
    const hours = (Date.now() - cutoff.getTime()) / (60 * 60 * 1000);
    expect(hours).toBeGreaterThan(MonitoringSamplerService.RETENTION_HOURS - 0.1);
    expect(hours).toBeLessThan(MonitoringSamplerService.RETENTION_HOURS + 0.1);
  });

  it('never throws when retention fails', async () => {
    const failingRepository: MonitoringRepository = {
      insertSamples: vi.fn(async () => undefined),
      listHistory: vi.fn(async () => []),
      deleteOlderThan: vi.fn(async () => { throw new Error('database locked'); })
    };
    const metrics = new SystemMetricsService({ getMetrics: async () => hostMetrics });
    const services = { listAll: vi.fn(async () => []) } as unknown as InstalledServiceManager;
    const fleet = { getFleetStats: vi.fn(async () => fleetStats(true)) };
    const sampler = new MonitoringSamplerService(metrics, services, fleet, failingRepository);

    await expect(sampler.runRetention()).resolves.toBeUndefined();
  });
});

describe('MonitoringSamplerService intervals', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('samples on the configured interval while started', async () => {
    const { sampler, inserted } = createHarness();

    sampler.start();
    await vi.advanceTimersByTimeAsync(MonitoringSamplerService.SAMPLE_INTERVAL_MS * 2);
    sampler.stop();

    expect(inserted.length).toBeGreaterThanOrEqual(2);
  });

  it('stops sampling after stop is called', async () => {
    const { sampler, inserted } = createHarness();

    sampler.start();
    await vi.advanceTimersByTimeAsync(MonitoringSamplerService.SAMPLE_INTERVAL_MS);
    sampler.stop();
    const captured = inserted.length;
    await vi.advanceTimersByTimeAsync(MonitoringSamplerService.SAMPLE_INTERVAL_MS * 2);

    expect(inserted.length).toBe(captured);
  });

  it('does not schedule twice when started repeatedly', async () => {
    const { sampler, inserted } = createHarness();

    sampler.start();
    sampler.start();
    await vi.advanceTimersByTimeAsync(MonitoringSamplerService.SAMPLE_INTERVAL_MS);
    sampler.stop();

    expect(inserted).toHaveLength(2);
  });
});
