import { describe, expect, it } from 'vitest';
import type { SystemMetrics } from '../../system/application/system-metrics.service';
import { evaluateAlerts } from './monitoring-alerts.evaluator';
import type { ServiceRuntimeMetrics } from './monitoring.models';

const healthyHost = (): SystemMetrics => ({
  memory: { totalBytes: 16_000, usedBytes: 8_000, freeBytes: 8_000, usagePercent: 50 },
  disk: { totalBytes: 100_000, usedBytes: 40_000, freeBytes: 60_000, usagePercent: 40 },
  cpu: { usagePercent: 12 },
  network: { localIp: '10.0.0.20' }
});

const service = (overrides: Partial<ServiceRuntimeMetrics> = {}): ServiceRuntimeMetrics => ({
  id: 'service-1',
  name: 'PostgreSQL',
  status: 'running',
  health: 'healthy',
  cpuPercent: 5,
  memoryUsedBytes: 100,
  memoryLimitBytes: 1000,
  networkRxBytes: 10,
  networkTxBytes: 20,
  restartCount: 0,
  uptimeSeconds: 3600,
  containerCount: 1,
  runningContainers: 1,
  updatedAt: '2026-09-10T10:00:00.000Z',
  ...overrides
});

describe('evaluateAlerts', () => {
  it('returns no alerts for a healthy host and healthy services', () => {
    expect(evaluateAlerts(healthyHost(), [service()])).toEqual([]);
  });

  it('raises a critical alert when host CPU crosses the threshold', () => {
    const host = { ...healthyHost(), cpu: { usagePercent: 91 } };

    const alerts = evaluateAlerts(host, []);

    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.id).toBe('host-cpu');
    expect(alerts[0]!.scope).toBe('host');
    expect(alerts[0]!.resourceId).toBe('host');
    expect(alerts[0]!.severity).toBe('critical');
    expect(alerts[0]!.message).toContain('CPU');
  });

  it('does not raise the CPU alert at exactly the threshold', () => {
    const host = { ...healthyHost(), cpu: { usagePercent: 90 } };

    expect(evaluateAlerts(host, [])).toEqual([]);
  });

  it('raises a critical alert when host memory crosses the threshold', () => {
    const host = { ...healthyHost(), memory: { totalBytes: 16_000, usedBytes: 15_000, freeBytes: 1_000, usagePercent: 94 } };

    const alerts = evaluateAlerts(host, []);

    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.id).toBe('host-memory');
    expect(alerts[0]!.severity).toBe('critical');
  });

  it('raises a warning alert when host disk crosses its threshold', () => {
    const host = { ...healthyHost(), disk: { totalBytes: 100_000, usedBytes: 90_000, freeBytes: 10_000, usagePercent: 90 } };

    const alerts = evaluateAlerts(host, []);

    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.id).toBe('host-disk');
    expect(alerts[0]!.severity).toBe('warning');
  });

  it('raises a warning alert for an unhealthy service', () => {
    const alerts = evaluateAlerts(healthyHost(), [service({ health: 'unhealthy' })]);

    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.id).toBe('service-service-1-health');
    expect(alerts[0]!.scope).toBe('service');
    expect(alerts[0]!.resourceId).toBe('service-1');
    expect(alerts[0]!.resourceName).toBe('PostgreSQL');
    expect(alerts[0]!.severity).toBe('warning');
    expect(alerts[0]!.message).toContain('PostgreSQL');
  });

  it('raises a critical alert for a failed service', () => {
    const alerts = evaluateAlerts(healthyHost(), [service({ status: 'failed' })]);

    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.id).toBe('service-service-1-status');
    expect(alerts[0]!.severity).toBe('critical');
  });

  it('collects host and service alerts together', () => {
    const host = { ...healthyHost(), cpu: { usagePercent: 95 }, disk: { totalBytes: 100_000, usedBytes: 90_000, freeBytes: 10_000, usagePercent: 90 } };

    const alerts = evaluateAlerts(host, [service({ health: 'unhealthy' }), service({ id: 'service-2', name: 'Redis', status: 'failed' })]);

    expect(alerts.map((alert) => alert.id)).toEqual(['host-cpu', 'host-disk', 'service-service-1-health', 'service-service-2-status']);
  });
});
