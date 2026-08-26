import { describe, expect, it } from 'vitest';
import { SystemMetricsService, type SystemMetricsProvider } from './system-metrics.service';

describe('SystemMetricsService', () => {
  it('returns host resource metrics from the provider', async () => {
    const metrics = {
      memory: { totalBytes: 16_000, usedBytes: 6_000, freeBytes: 10_000, usagePercent: 37.5 },
      disk: { totalBytes: 100_000, usedBytes: 40_000, freeBytes: 60_000, usagePercent: 40 },
      cpu: { usagePercent: 18.25 },
      network: { localIp: '192.168.1.25' }
    };
    const provider: SystemMetricsProvider = { getMetrics: async () => metrics };

    await expect(new SystemMetricsService(provider).getMetrics()).resolves.toEqual(metrics);
  });
});
