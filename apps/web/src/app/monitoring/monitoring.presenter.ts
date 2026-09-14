import type { MonitoringSample, ServiceRuntimeMetrics } from './monitoring.models';

/** One point of a time-series chart. */
export interface ChartPoint {
  readonly t: number;
  readonly v: number;
}

/** Tooltip state for the chart point nearest to the pointer. */
export interface ChartTooltip {
  readonly point: ChartPoint;
  readonly x: number;
  readonly y: number;
  readonly timeLabel: string;
  readonly valueLabel: string;
  readonly percentLabel: string;
}

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 60 * SECONDS_PER_MINUTE;
const SECONDS_PER_DAY = 24 * SECONDS_PER_HOUR;

const roundCoordinate = (value: number): number => Math.round(value * 10) / 10;
const roundPercent = (value: number): number => Math.round(value * 10) / 10;
const twoDigits = (value: number): string => String(value).padStart(2, '0');

/** Presentation logic for the Monitoring page. */
export class MonitoringPresenter {
  /** Counts services grouped by the status buckets shown in the UI. */
  public serviceStatusCounts(services: readonly ServiceRuntimeMetrics[]): { readonly running: number; readonly stopped: number; readonly failed: number; readonly other: number } {
    const counts = { running: 0, stopped: 0, failed: 0, other: 0 };
    for (const service of services) {
      if (service.status === 'running') counts.running += 1;
      else if (service.status === 'stopped') counts.stopped += 1;
      else if (service.status === 'failed') counts.failed += 1;
      else counts.other += 1;
    }
    return counts;
  }

  /** Returns badge classes for a service status. */
  public statusBadgeClasses(status: string): string {
    if (status === 'running') return 'badge badge-success';
    if (status === 'installing' || status === 'pending') return 'badge badge-warning';
    return 'badge badge-danger';
  }

  /** Returns badge classes for a service health signal. */
  public healthBadgeClasses(health: string): string {
    if (health === 'healthy') return 'badge badge-success';
    if (health === 'unhealthy') return 'badge badge-danger';
    return 'badge badge-warning';
  }

  /** Returns badge classes for an alert severity. */
  public alertBadgeClasses(severity: 'warning' | 'critical'): string {
    return severity === 'critical' ? 'badge badge-danger' : 'badge badge-warning';
  }

  /** Renders a short relative-time label for an ISO timestamp. */
  public relativeTime(iso: string, now: Date = new Date()): string {
    const age = now.getTime() - Date.parse(iso);
    if (age < MS_PER_MINUTE) return 'just now';
    if (age < MS_PER_HOUR) return `${Math.floor(age / MS_PER_MINUTE)}m ago`;
    if (age < MS_PER_DAY) return `${Math.floor(age / MS_PER_HOUR)}h ago`;
    return `${Math.floor(age / MS_PER_DAY)}d ago`;
  }

  /** Renders a compact uptime label. */
  public uptimeLabel(seconds: number | null): string {
    if (seconds === null) return '—';
    const days = Math.floor(seconds / SECONDS_PER_DAY);
    const hours = Math.floor((seconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
    const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  /** Returns the most recently updated services, newest first. */
  public recentChanges(services: readonly ServiceRuntimeMetrics[], limit: number): readonly ServiceRuntimeMetrics[] {
    return [...services].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, limit);
  }

  /** Maps samples to chart points, skipping samples without a value. */
  public chartPoints(samples: readonly MonitoringSample[], selector: (sample: MonitoringSample) => number | null): readonly ChartPoint[] {
    return samples.flatMap((current) => {
      const value = selector(current);
      const capturedAt = Date.parse(current.capturedAt);
      return value !== null && Number.isFinite(capturedAt) ? [{ t: capturedAt, v: value }] : [];
    });
  }

  /** Renders the percentage usage for a value against its total capacity. */
  public usagePercentLabel(value: number | null, max: number | null): string {
    if (value === null || max === null || max <= 0) return '—';
    return `${roundPercent(value / max * 100)}%`;
  }

  /** Renders a compact local time label for chart tooltips. */
  public chartTimeLabel(timestamp: number): string {
    const date = new Date(timestamp);
    return `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
  }

  /** Returns the chart tooltip data for the point nearest to a pointer x-ratio. */
  public chartTooltip(points: readonly ChartPoint[], pointerRatio: number, width: number, height: number, max?: number | null, valueFormatter: (value: number) => string = (value) => String(value)): ChartTooltip | null {
    if (points.length === 0) return null;
    const first = points[0]!;
    const last = points[points.length - 1]!;
    const clampedRatio = Math.max(0, Math.min(1, pointerRatio));
    const targetTime = first.t + (last.t - first.t) * clampedRatio;
    const nearest = points.reduce((closest, point) => Math.abs(point.t - targetTime) < Math.abs(closest.t - targetTime) ? point : closest, first);
    const coordinate = this.chartCoordinate(nearest, points, width, height, max ?? undefined);
    return {
      point: nearest,
      x: coordinate.x,
      y: coordinate.y,
      timeLabel: this.chartTimeLabel(nearest.t),
      valueLabel: valueFormatter(nearest.v),
      percentLabel: this.usagePercentLabel(nearest.v, max ?? null)
    };
  }

  /** Builds an SVG polyline path scaled to the chart box, optionally to a fixed value ceiling. */
  public chartLinePath(points: readonly ChartPoint[], width: number, height: number, max?: number): string {
    if (points.length < 2) return '';
    const first = points[0]!;
    const last = points[points.length - 1]!;
    const timeSpan = last.t - first.t;
    const ceiling = max !== undefined && max > 0 ? max : Math.max(...points.map((point) => point.v));
    const coordinates = points.map((point) => {
      const x = timeSpan > 0 ? (point.t - first.t) / timeSpan * width : width / 2;
      const rawY = ceiling > 0 ? height - (point.v / ceiling) * height : height / 2;
      const y = Math.max(0, Math.min(height, rawY));
      return `${roundCoordinate(x)} ${roundCoordinate(y)}`;
    });
    return `M ${coordinates.join(' L ')}`;
  }

  /** Builds an SVG area path that closes the line at the baseline. */
  public chartAreaPath(points: readonly ChartPoint[], width: number, height: number, max?: number): string {
    const line = this.chartLinePath(points, width, height, max);
    if (line === '') return '';
    return `${line} L ${width} ${height} L 0 ${height} Z`;
  }

  private chartCoordinate(point: ChartPoint, points: readonly ChartPoint[], width: number, height: number, max?: number): { readonly x: number; readonly y: number } {
    const first = points[0]!;
    const last = points[points.length - 1]!;
    const timeSpan = last.t - first.t;
    const ceiling = max !== undefined && max > 0 ? max : Math.max(...points.map((current) => current.v));
    const x = timeSpan > 0 ? (point.t - first.t) / timeSpan * width : width / 2;
    const rawY = ceiling > 0 ? height - (point.v / ceiling) * height : height / 2;
    return { x: roundCoordinate(x), y: roundCoordinate(Math.max(0, Math.min(height, rawY))) };
  }
}
