import { describe, expect, it } from 'vitest';
import { MonitoringPresenter } from './monitoring.presenter';
import type { MonitoringSample, ServiceRuntimeMetrics } from './monitoring.models';

const service = (overrides: Partial<ServiceRuntimeMetrics> = {}): ServiceRuntimeMetrics => ({
  id: 'service-1',
  name: 'PostgreSQL',
  status: 'running',
  health: 'healthy',
  cpuPercent: 1.5,
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

const sample = (capturedAt: string, cpuPercent: number | null): MonitoringSample => ({
  capturedAt,
  cpuPercent,
  memoryUsedBytes: null,
  memoryLimitBytes: null,
  diskUsedBytes: null,
  diskLimitBytes: null,
  networkRxBytes: null,
  networkTxBytes: null
});

describe('MonitoringPresenter.serviceStatusCounts', () => {
  it('returns zeroed counts for an empty service list', () => {
    expect(new MonitoringPresenter().serviceStatusCounts([])).toEqual({ running: 0, stopped: 0, failed: 0, other: 0 });
  });

  it('counts services by status', () => {
    const services = [
      service({ id: '1', status: 'running' }),
      service({ id: '2', status: 'running' }),
      service({ id: '3', status: 'stopped' }),
      service({ id: '4', status: 'failed' }),
      service({ id: '5', status: 'installing' }),
      service({ id: '6', status: 'pending' })
    ];

    expect(new MonitoringPresenter().serviceStatusCounts(services)).toEqual({ running: 2, stopped: 1, failed: 1, other: 2 });
  });
});

describe('MonitoringPresenter badge classes', () => {
  it('maps service status to badge classes', () => {
    const presenter = new MonitoringPresenter();
    expect(presenter.statusBadgeClasses('running')).toContain('badge-success');
    expect(presenter.statusBadgeClasses('installing')).toContain('badge-warning');
    expect(presenter.statusBadgeClasses('pending')).toContain('badge-warning');
    expect(presenter.statusBadgeClasses('stopped')).toContain('badge-danger');
    expect(presenter.statusBadgeClasses('failed')).toContain('badge-danger');
    expect(presenter.statusBadgeClasses('removing')).toContain('badge-danger');
  });

  it('maps health to badge classes', () => {
    const presenter = new MonitoringPresenter();
    expect(presenter.healthBadgeClasses('healthy')).toContain('badge-success');
    expect(presenter.healthBadgeClasses('unhealthy')).toContain('badge-danger');
    expect(presenter.healthBadgeClasses('starting')).toContain('badge-warning');
    expect(presenter.healthBadgeClasses('unknown')).toContain('badge-warning');
  });

  it('maps alert severity to badge classes', () => {
    const presenter = new MonitoringPresenter();
    expect(presenter.alertBadgeClasses('critical')).toContain('badge-danger');
    expect(presenter.alertBadgeClasses('warning')).toContain('badge-warning');
  });
});

describe('MonitoringPresenter.relativeTime', () => {
  const presenter = new MonitoringPresenter();
  const now = new Date('2026-09-10T10:00:00.000Z');

  it('labels moments less than a minute old as just now', () => {
    expect(presenter.relativeTime('2026-09-10T09:59:45.000Z', now)).toBe('just now');
  });

  it('labels minutes, hours and days', () => {
    expect(presenter.relativeTime('2026-09-10T09:55:00.000Z', now)).toBe('5m ago');
    expect(presenter.relativeTime('2026-09-10T07:00:00.000Z', now)).toBe('3h ago');
    expect(presenter.relativeTime('2026-09-08T10:00:00.000Z', now)).toBe('2d ago');
  });
});

describe('MonitoringPresenter.uptimeLabel', () => {
  const presenter = new MonitoringPresenter();

  it('renders a dash when uptime is unknown', () => {
    expect(presenter.uptimeLabel(null)).toBe('—');
  });

  it('renders seconds, minutes, hours and days', () => {
    expect(presenter.uptimeLabel(45)).toBe('45s');
    expect(presenter.uptimeLabel(60)).toBe('1m');
    expect(presenter.uptimeLabel(3600)).toBe('1h');
    expect(presenter.uptimeLabel(3660)).toBe('1h 1m');
    expect(presenter.uptimeLabel(86_400)).toBe('1d');
    expect(presenter.uptimeLabel(90_000)).toBe('1d 1h');
  });
});

describe('MonitoringPresenter.recentChanges', () => {
  it('returns the most recently updated services in descending order', () => {
    const services = [
      service({ id: '1', name: 'Old', updatedAt: '2026-09-08T10:00:00.000Z' }),
      service({ id: '2', name: 'Newest', updatedAt: '2026-09-10T09:00:00.000Z' }),
      service({ id: '3', name: 'Middle', updatedAt: '2026-09-09T10:00:00.000Z' })
    ];

    const changes = new MonitoringPresenter().recentChanges(services, 2);

    expect(changes.map((change) => change.name)).toEqual(['Newest', 'Middle']);
  });
});

describe('MonitoringPresenter.chartPoints', () => {
  it('maps samples to chart points and skips samples without a value', () => {
    const samples = [
      sample('2026-09-10T09:00:00.000Z', 10),
      sample('2026-09-10T09:01:00.000Z', null),
      sample('2026-09-10T09:02:00.000Z', 20)
    ];

    const points = new MonitoringPresenter().chartPoints(samples, (current) => current.cpuPercent);

    expect(points).toEqual([
      { t: Date.parse('2026-09-10T09:00:00.000Z'), v: 10 },
      { t: Date.parse('2026-09-10T09:02:00.000Z'), v: 20 }
    ]);
  });
});

describe('MonitoringPresenter chart paths', () => {
  const presenter = new MonitoringPresenter();

  it('builds a scaled line path', () => {
    const points = [
      { t: 0, v: 0 },
      { t: 100, v: 50 }
    ];

    expect(presenter.chartLinePath(points, 100, 50)).toBe('M 0 50 L 100 0');
  });

  it('builds a line path across several points', () => {
    const points = [
      { t: 0, v: 25 },
      { t: 50, v: 75 },
      { t: 100, v: 50 }
    ];

    expect(presenter.chartLinePath(points, 100, 50)).toBe('M 0 33.3 L 50 0 L 100 16.7');
  });

  it('returns an empty path for fewer than two points', () => {
    expect(presenter.chartLinePath([], 100, 50)).toBe('');
    expect(presenter.chartLinePath([{ t: 0, v: 1 }], 100, 50)).toBe('');
  });

  it('renders a flat line when all values are zero', () => {
    const points = [
      { t: 0, v: 0 },
      { t: 100, v: 0 }
    ];

    expect(presenter.chartLinePath(points, 100, 50)).toBe('M 0 25 L 100 25');
  });

  it('builds an area path that closes at the baseline', () => {
    const points = [
      { t: 0, v: 0 },
      { t: 100, v: 50 }
    ];

    expect(presenter.chartAreaPath(points, 100, 50)).toBe('M 0 50 L 100 0 L 100 50 L 0 50 Z');
  });

  it('returns an empty area path for fewer than two points', () => {
    expect(presenter.chartAreaPath([{ t: 0, v: 1 }], 100, 50)).toBe('');
  });
});

describe('MonitoringPresenter chart labels', () => {
  const presenter = new MonitoringPresenter();

  it('renders usage percentages against a metric ceiling', () => {
    expect(presenter.usagePercentLabel(50, 200)).toBe('25%');
    expect(presenter.usagePercentLabel(1, 3)).toBe('33.3%');
  });

  it('renders a dash when a usage percentage cannot be calculated', () => {
    expect(presenter.usagePercentLabel(null, 200)).toBe('—');
    expect(presenter.usagePercentLabel(50, null)).toBe('—');
    expect(presenter.usagePercentLabel(50, 0)).toBe('—');
  });

  it('formats chart timestamps as compact hour and minute labels', () => {
    const label = presenter.chartTimeLabel(Date.parse('2026-09-10T09:05:00.000Z'));

    expect(label).toMatch(/\d{2}:\d{2}/);
  });
});

describe('MonitoringPresenter chart tooltip', () => {
  const presenter = new MonitoringPresenter();
  const points = [
    { t: 0, v: 0 },
    { t: 100, v: 50 },
    { t: 200, v: 100 }
  ];

  it('returns the nearest point to the pointer position', () => {
    const tooltip = presenter.chartTooltip(points, 0.45, 300, 120, 100, (value) => `${value} units`);

    expect(tooltip).toMatchObject({
      point: { t: 100, v: 50 },
      x: 150,
      y: 60,
      valueLabel: '50 units',
      percentLabel: '50%'
    });
  });

  it('clamps the pointer ratio inside the chart bounds', () => {
    expect(presenter.chartTooltip(points, -1, 300, 120, 100)?.point).toEqual(points[0]);
    expect(presenter.chartTooltip(points, 2, 300, 120, 100)?.point).toEqual(points[2]);
  });

  it('returns null when there are no chart points', () => {
    expect(presenter.chartTooltip([], 0.5, 300, 120, 100)).toBeNull();
  });
});

describe('MonitoringPresenter chart ceiling', () => {
  const presenter = new MonitoringPresenter();

  it('scales the line to a provided ceiling instead of the data maximum', () => {
    const points = [
      { t: 0, v: 0 },
      { t: 100, v: 50 }
    ];

    expect(presenter.chartLinePath(points, 100, 50, 100)).toBe('M 0 50 L 100 25');
  });

  it('clamps values above the ceiling to the top edge', () => {
    const points = [
      { t: 0, v: 50 },
      { t: 100, v: 150 }
    ];

    expect(presenter.chartLinePath(points, 100, 50, 100)).toBe('M 0 25 L 100 0');
  });

  it('renders zero values at the baseline when a ceiling is provided', () => {
    const points = [
      { t: 0, v: 0 },
      { t: 100, v: 0 }
    ];

    expect(presenter.chartLinePath(points, 100, 50, 100)).toBe('M 0 50 L 100 50');
  });

  it('ignores a non-positive ceiling and falls back to the data maximum', () => {
    const points = [
      { t: 0, v: 0 },
      { t: 100, v: 50 }
    ];

    expect(presenter.chartLinePath(points, 100, 50, 0)).toBe('M 0 50 L 100 0');
  });

  it('closes the area at the baseline with a ceiling', () => {
    const points = [
      { t: 0, v: 50 },
      { t: 100, v: 100 }
    ];

    expect(presenter.chartAreaPath(points, 100, 50, 100)).toBe('M 0 25 L 100 0 L 100 50 L 0 50 Z');
  });
});
