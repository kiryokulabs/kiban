import { describe, expect, it } from 'vitest';
import { NodeSystemMetricsProvider, type SystemRuntimeReader } from './node-system-metrics.provider';

describe('NodeSystemMetricsProvider', () => {
  it('calculates memory, disk and CPU usage percentages', async () => {
    const reader: SystemRuntimeReader = {
      memory: async () => ({ total: 1_000, available: 400 }),
      diskSpace: async () => ({ size: 2_000, free: 500 }),
      cpuTimes: (() => {
        const samples = [
          [{ idle: 100, total: 200 }, { idle: 200, total: 400 }],
          [{ idle: 150, total: 300 }, { idle: 230, total: 500 }]
        ];
        let index = 0;
        return () => samples[index++] ?? samples.at(-1)!;
      })(),
      wait: async () => undefined,
      networkAddresses: () => [{ address: '127.0.0.1', family: 'IPv4', internal: true }, { address: '192.168.1.25', family: 'IPv4', internal: false }]
    };

    const provider = new NodeSystemMetricsProvider('/var/lib/kiban', reader);

    await expect(provider.getMetrics()).resolves.toEqual({
      memory: { totalBytes: 1_000, usedBytes: 600, freeBytes: 400, usagePercent: 60 },
      disk: { totalBytes: 2_000, usedBytes: 1_500, freeBytes: 500, usagePercent: 75 },
      cpu: { usagePercent: 60 },
      network: { localIp: '192.168.1.25' }
    });
  });

  it('keeps percentages at zero when totals are unavailable', async () => {
    const reader: SystemRuntimeReader = {
      memory: async () => ({ total: 0, available: 0 }),
      diskSpace: async () => ({ size: 0, free: 0 }),
      cpuTimes: () => [{ idle: 0, total: 0 }],
      wait: async () => undefined,
      networkAddresses: () => [{ address: '127.0.0.1', family: 'IPv4', internal: true }]
    };

    const provider = new NodeSystemMetricsProvider('/var/lib/kiban', reader);

    await expect(provider.getMetrics()).resolves.toEqual({
      memory: { totalBytes: 0, usedBytes: 0, freeBytes: 0, usagePercent: 0 },
      disk: { totalBytes: 0, usedBytes: 0, freeBytes: 0, usagePercent: 0 },
      cpu: { usagePercent: 0 },
      network: { localIp: null }
    });
  });
});
