import { describe, expect, it } from 'vitest';
import { SystemMetricsController } from './system-metrics.controller';
import { SystemMetricsService, type SystemMetrics } from '../application/system-metrics.service';

describe('SystemMetricsController', () => {
  it('exposes system metrics without Docker terminology', async () => {
    const metrics: SystemMetrics = {
      memory: { totalBytes: 16, usedBytes: 8, freeBytes: 8, usagePercent: 50 },
      disk: { totalBytes: 100, usedBytes: 25, freeBytes: 75, usagePercent: 25 },
      cpu: { usagePercent: 10 },
      network: { localIp: '10.0.0.20' }
    };
    const service = new SystemMetricsService({ getMetrics: async () => metrics });
    const controller = new SystemMetricsController(service);

    await expect(controller.getMetrics()).resolves.toEqual(metrics);
  });
});
