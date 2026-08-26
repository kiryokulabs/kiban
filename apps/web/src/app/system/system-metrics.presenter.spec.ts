import { describe, expect, it } from 'vitest';
import { SystemMetricsPresenter } from './system-metrics.presenter';

describe('SystemMetricsPresenter', () => {
  const presenter = new SystemMetricsPresenter();

  it('formats resource usage for compact header display', () => {
    expect(presenter.percentLabel(39.4)).toBe('39%');
    expect(presenter.percentLabel(39.5)).toBe('40%');
  });

  it('formats bytes using binary units', () => {
    expect(presenter.bytesLabel(512)).toBe('512 B');
    expect(presenter.bytesLabel(1536)).toBe('1.5 KB');
    expect(presenter.bytesLabel(2 * 1024 * 1024 * 1024)).toBe('2 GB');
  });

  it('builds accessible metric labels', () => {
    expect(presenter.metricTitle('Memory', 1024, 512, 50)).toBe('Memory: 512 B used of 1 KB, 50%');
  });

  it('chooses visual status colors from usage thresholds', () => {
    expect(presenter.statusClass(49)).toContain('bg-emerald');
    expect(presenter.statusClass(70)).toContain('bg-amber');
    expect(presenter.statusClass(90)).toContain('bg-red');
  });

  it('uses a fallback label when the local IP is unavailable', () => {
    expect(presenter.localIpLabel(null)).toBe('IP unavailable');
    expect(presenter.localIpLabel('192.168.1.25')).toBe('192.168.1.25');
  });
});
