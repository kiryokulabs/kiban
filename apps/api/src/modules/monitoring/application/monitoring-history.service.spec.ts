import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { MonitoringHistoryService } from './monitoring-history.service';
import type { MonitoringRepository } from './monitoring-repository';
import type { MonitoringSample } from './monitoring.models';

const sample = (capturedAt: Date): MonitoringSample => ({
  capturedAt,
  cpuPercent: 10,
  memoryUsedBytes: 8_000,
  memoryLimitBytes: 16_000,
  diskUsedBytes: 40_000,
  diskLimitBytes: 100_000,
  networkRxBytes: null,
  networkTxBytes: null
});

const createRepository = (): { readonly repository: MonitoringRepository; readonly calls: { scope: string; resourceId: string; since: Date; maxPoints: number }[] } => {
  const calls: { scope: string; resourceId: string; since: Date; maxPoints: number }[] = [];
  const repository: MonitoringRepository = {
    insertSamples: vi.fn(async () => undefined),
    listHistory: vi.fn(async (scope: string, resourceId: string, since: Date, maxPoints: number): Promise<readonly MonitoringSample[]> => {
      calls.push({ scope, resourceId, since, maxPoints });
      return [sample(since)];
    }),
    deleteOlderThan: vi.fn(async () => undefined)
  };
  return { repository, calls };
};

const NOW = Date.parse('2026-09-10T10:00:00.000Z');

describe('MonitoringHistoryService', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(NOW)); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns history for a valid scope, resource and range', async () => {
    const { repository, calls } = createRepository();
    const service = new MonitoringHistoryService(repository);

    const history = await service.getHistory('host', 'host', 24);

    expect(history.scope).toBe('host');
    expect(history.resourceId).toBe('host');
    expect(history.samples).toHaveLength(1);
    expect(calls[0]!.scope).toBe('host');
    expect(calls[0]!.resourceId).toBe('host');
    expect(calls[0]!.maxPoints).toBe(MonitoringHistoryService.MAX_HISTORY_POINTS);
    expect(calls[0]!.since.getTime()).toBe(NOW - 24 * 60 * 60 * 1000);
  });

  it('rejects an unknown scope', async () => {
    const { repository } = createRepository();
    const service = new MonitoringHistoryService(repository);

    await expect(service.getHistory('cluster', 'host', 24)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an empty resource id', async () => {
    const { repository } = createRepository();
    const service = new MonitoringHistoryService(repository);

    await expect(service.getHistory('host', '  ', 24)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects non-integer, zero, negative and oversized hour ranges', async () => {
    const { repository } = createRepository();
    const service = new MonitoringHistoryService(repository);

    await expect(service.getHistory('host', 'host', Number.NaN)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.getHistory('host', 'host', 0)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.getHistory('host', 'host', -3)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.getHistory('host', 'host', MonitoringHistoryService.MAX_HISTORY_HOURS + 1)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts the maximum retained range', async () => {
    const { repository, calls } = createRepository();
    const service = new MonitoringHistoryService(repository);

    await service.getHistory('service', 'service-1', MonitoringHistoryService.MAX_HISTORY_HOURS);

    expect(calls[0]!.resourceId).toBe('service-1');
    expect(calls[0]!.since.getTime()).toBe(NOW - MonitoringHistoryService.MAX_HISTORY_HOURS * 60 * 60 * 1000);
  });

  it('keeps the maximum history range aligned with the retention window', () => {
    expect(MonitoringHistoryService.MAX_HISTORY_HOURS).toBe(24);
  });
});
