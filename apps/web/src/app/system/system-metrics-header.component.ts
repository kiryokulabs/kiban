import { Component, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, interval, startWith, switchMap } from 'rxjs';
import { SystemMetricsService, type SystemMetrics } from './system-metrics.service';
import { SystemMetricsPresenter } from './system-metrics.presenter';

const REFRESH_INTERVAL_MS = 10_000;

@Component({
  selector: 'kiban-system-metrics-header',
  standalone: true,
  template: `
    @if (metrics(); as current) {
      <div class="flex flex-wrap items-center gap-2" aria-label="System resource usage">
        @if (!compact()) {
          <span class="hidden rounded-md border kb-border bg-muted px-2 py-1 text-[11px] c-muted sm:inline" title="Kiban host local IP">
            IP {{ presenter.localIpLabel(current.network.localIp) }}
          </span>
        }

        <span class="metric-pill" [title]="memoryTitle(current)">
          <span>RAM</span>
          <span class="font-medium c-text">{{ presenter.percentLabel(current.memory.usagePercent) }}</span>
          <span class="metric-track">
            <span class="metric-fill" [class]="metricFillClass(current.memory.usagePercent)" [style.width.%]="presenter.percentWidth(current.memory.usagePercent)"></span>
          </span>
        </span>

        <span class="metric-pill" [title]="cpuTitle(current)">
          <span>CPU</span>
          <span class="font-medium c-text">{{ presenter.percentLabel(current.cpu.usagePercent) }}</span>
          <span class="metric-track">
            <span class="metric-fill" [class]="metricFillClass(current.cpu.usagePercent)" [style.width.%]="presenter.percentWidth(current.cpu.usagePercent)"></span>
          </span>
        </span>

        <span class="metric-pill" [title]="diskTitle(current)">
          <span>Disk</span>
          <span class="font-medium c-text">{{ presenter.percentLabel(current.disk.usagePercent) }}</span>
          <span class="metric-track">
            <span class="metric-fill" [class]="metricFillClass(current.disk.usagePercent)" [style.width.%]="presenter.percentWidth(current.disk.usagePercent)"></span>
          </span>
        </span>
      </div>
    } @else if (unavailable()) {
      <span class="rounded-md border kb-border bg-muted px-2 py-1 text-[11px] c-muted" title="System metrics are temporarily unavailable">
        Metrics unavailable
      </span>
    }
  `,
  styles: [`
    .metric-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      border: 1px solid var(--color-line);
      border-radius: 0.375rem;
      background: var(--color-surface-overlay);
      padding: 0.25rem 0.5rem;
      font-size: 11px;
      color: var(--kb-muted-fg);
    }

    .metric-track {
      position: relative;
      display: inline-flex;
      height: 0.25rem;
      width: 1.75rem;
      overflow: hidden;
      border-radius: 999px;
      background: rgb(148 163 184 / 0.22);
    }

    .metric-fill {
      height: 100%;
      border-radius: inherit;
      box-shadow: 0 0 10px currentColor;
      transition: width 180ms ease, background-color 180ms ease;
    }
  `]
})
export class SystemMetricsHeaderComponent {
  readonly compact = input(false);

  protected readonly metrics = signal<SystemMetrics | null>(null);
  protected readonly unavailable = signal(false);
  protected readonly presenter = new SystemMetricsPresenter();

  public constructor(private readonly systemMetrics: SystemMetricsService) {
    interval(REFRESH_INTERVAL_MS).pipe(
      startWith(0),
      switchMap(() => this.systemMetrics.getMetrics().pipe(catchError(() => {
        this.unavailable.set(true);
        return EMPTY;
      }))),
      takeUntilDestroyed()
    ).subscribe((metrics) => {
      this.unavailable.set(false);
      this.metrics.set(metrics);
    });
  }

  protected metricFillClass(percent: number): string {
    return `metric-fill ${this.presenter.statusClass(percent)}`;
  }

  protected memoryTitle(metrics: SystemMetrics): string {
    return this.presenter.metricTitle('Memory', metrics.memory.totalBytes, metrics.memory.usedBytes, metrics.memory.usagePercent);
  }

  protected diskTitle(metrics: SystemMetrics): string {
    return this.presenter.metricTitle('Disk', metrics.disk.totalBytes, metrics.disk.usedBytes, metrics.disk.usagePercent);
  }

  protected cpuTitle(metrics: SystemMetrics): string {
    return `CPU: ${this.presenter.percentLabel(metrics.cpu.usagePercent)}`;
  }
}
