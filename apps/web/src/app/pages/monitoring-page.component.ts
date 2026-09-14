import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { EMPTY, catchError, interval, startWith, switchMap } from 'rxjs';
import { MonitoringApiService } from '../monitoring/monitoring-api.service';
import { MonitoringChartComponent } from '../monitoring/monitoring-chart.component';
import { MonitoringPresenter } from '../monitoring/monitoring.presenter';
import type { MonitoringHistory, MonitoringOverview } from '../monitoring/monitoring.models';
import { SystemMetricsPresenter } from '../system/system-metrics.presenter';
import { IconsComponent } from '../shared/icons.component';

const OVERVIEW_REFRESH_MS = 10_000;
const HISTORY_REFRESH_MS = 60_000;
const HISTORY_HOURS = 24;
const RECENT_CHANGES_LIMIT = 5;

@Component({
  selector: 'kiban-monitoring-page',
  standalone: true,
  imports: [RouterLink, IconsComponent, MonitoringChartComponent],
  template: `
    <div class="space-y-6">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="grid h-7 w-7 place-items-center rounded-lg bg-brand/20 text-brand-light">
            <kiban-icon name="activity" [size]="15" />
          </div>
          <h1 class="text-xl font-semibold kb-text">Monitoring</h1>
        </div>
      </div>

      @if (overview(); as current) {
        @if (current.alerts.length > 0) {
          <div class="card p-4" aria-label="Active alerts">
            <h2 class="flex items-center gap-2 text-sm font-semibold kb-text"><kiban-icon name="warning" [size]="14" /> Alerts</h2>
            <ul class="mt-3 space-y-2">
              @for (alert of current.alerts; track alert.id) {
                <li class="flex items-center gap-2 text-xs">
                  <span [class]="presenter.alertBadgeClasses(alert.severity)">{{ alert.severity }}</span>
                  <span class="c-muted">{{ alert.message }}</span>
                </li>
              }
            </ul>
          </div>
        }

        <div>
          <h2 class="flex items-center gap-2 text-sm font-semibold kb-text"><kiban-icon name="server" [size]="14" /> Host resources</h2>
          <p class="mt-1 text-xs c-muted">Kiban host usage over the last {{ historyHours }} hours.</p>
          <div class="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div class="card p-4">
              <div class="flex items-baseline justify-between gap-2">
                <p class="text-xs c-muted">CPU</p>
                <p class="text-sm font-semibold kb-text">{{ hostPresenter.percentLabel(current.host.cpu.usagePercent) }}</p>
              </div>
              <kiban-monitoring-chart [points]="cpuPoints()" [max]="100" maxLabel="100%" label="CPU" [valueFormatter]="percentFormatter" />
            </div>
            <div class="card p-4">
              <div class="flex items-baseline justify-between gap-2">
                <p class="text-xs c-muted">Memory</p>
                <p class="text-sm font-semibold kb-text">{{ hostPresenter.percentLabel(current.host.memory.usagePercent) }} · {{ hostPresenter.bytesLabel(current.host.memory.usedBytes) }} of {{ hostPresenter.bytesLabel(current.host.memory.totalBytes) }}</p>
              </div>
              <kiban-monitoring-chart [points]="memoryPoints()" [max]="current.host.memory.totalBytes" [maxLabel]="hostPresenter.bytesLabel(current.host.memory.totalBytes)" label="Memory" [valueFormatter]="bytesFormatter" />
            </div>
            <div class="card p-4">
              <div class="flex items-baseline justify-between gap-2">
                <p class="text-xs c-muted">Disk</p>
                <p class="text-sm font-semibold kb-text">{{ hostPresenter.percentLabel(current.host.disk.usagePercent) }} · {{ hostPresenter.bytesLabel(current.host.disk.usedBytes) }} of {{ hostPresenter.bytesLabel(current.host.disk.totalBytes) }}</p>
              </div>
              <kiban-monitoring-chart [points]="diskPoints()" [max]="current.host.disk.totalBytes" [maxLabel]="hostPresenter.bytesLabel(current.host.disk.totalBytes)" label="Disk" [valueFormatter]="bytesFormatter" />
            </div>
          </div>
          <p class="mt-2 text-xs c-muted">IP {{ hostPresenter.localIpLabel(current.host.network.localIp) }}</p>
        </div>

        <div>
          <h2 class="flex items-center gap-2 text-sm font-semibold kb-text"><kiban-icon name="installed" [size]="14" /> Service health</h2>
          @if (current.services.length === 0) {
            <div class="card-subtle mt-3 px-4 py-3 text-xs c-muted">
              No services installed yet.
              <a routerLink="/catalog" class="ml-1 text-brand-light hover:underline">Browse the catalog</a>
            </div>
          } @else {
            <p class="mt-1 text-xs c-muted">
              {{ statusCounts().running }} running · {{ statusCounts().stopped }} stopped · {{ statusCounts().failed }} failed
              @if (statusCounts().other > 0) {<span> · {{ statusCounts().other }} in progress</span>}
            </p>
            @if (!current.runtimeAvailable) {
              <div class="card-subtle mt-3 px-4 py-3 text-xs c-muted" title="The runtime engine is not reachable right now">
                Runtime details are temporarily unavailable.
              </div>
            }
            <ul class="mt-3 space-y-2">
              @for (service of current.services; track service.id) {
                <li class="card flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
                  <div class="min-w-0 flex-1">
                    <a [routerLink]="['/services', service.id]" class="block truncate text-sm font-medium kb-text hover:underline">{{ service.name }}</a>
                    <div class="mt-1 flex flex-wrap items-center gap-1.5">
                      <span [class]="presenter.statusBadgeClasses(service.status)">{{ service.status }}</span>
                      <span [class]="presenter.healthBadgeClasses(service.health)">{{ service.health }}</span>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs c-muted sm:grid-cols-4">
                    <span>CPU <span class="font-medium kb-text">{{ service.cpuPercent === null ? '—' : hostPresenter.percentLabel(service.cpuPercent) }}</span></span>
                    <span>RAM <span class="font-medium kb-text">{{ service.memoryUsedBytes === null ? '—' : hostPresenter.bytesLabel(service.memoryUsedBytes) }}</span></span>
                    <span>Uptime <span class="font-medium kb-text">{{ presenter.uptimeLabel(service.uptimeSeconds) }}</span></span>
                    <span>Restarts <span class="font-medium kb-text">{{ service.restartCount }}</span></span>
                  </div>
                  <a class="btn-ghost btn shrink-0 gap-1 text-[11px] px-2 py-0.5" [routerLink]="['/services', service.id]">Manage</a>
                </li>
              }
            </ul>
          }
        </div>

        <div>
          <h2 class="flex items-center gap-2 text-sm font-semibold kb-text"><kiban-icon name="refresh" [size]="14" /> Recent changes</h2>
          @if (recentChanges().length === 0) {
            <div class="card-subtle mt-3 px-4 py-3 text-xs c-muted">No recent changes.</div>
          } @else {
            <ul class="mt-3 space-y-2">
              @for (change of recentChanges(); track change.id) {
                <li class="card flex items-center justify-between gap-2 p-3">
                  <a [routerLink]="['/services', change.id]" class="truncate text-sm kb-text hover:underline">{{ change.name }}</a>
                  <div class="flex shrink-0 items-center gap-2">
                    <span [class]="presenter.statusBadgeClasses(change.status)">{{ change.status }}</span>
                    <span class="text-xs c-muted">{{ presenter.relativeTime(change.updatedAt) }}</span>
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      } @else if (overviewUnavailable()) {
        <div class="card-subtle px-4 py-3 text-xs c-muted" title="Monitoring data is temporarily unavailable">
          Monitoring data is temporarily unavailable.
        </div>
      }

      @if (history(); as stored) {
        @if (stored.samples.length === 0) {
          <p class="text-xs c-muted">Collecting samples… charts appear after a few minutes.</p>
        }
      }
    </div>
  `
})
export class MonitoringPageComponent {
  private readonly monitoringApi = inject(MonitoringApiService);

  protected readonly presenter = new MonitoringPresenter();
  protected readonly hostPresenter = new SystemMetricsPresenter();
  protected readonly historyHours = HISTORY_HOURS;
  protected readonly percentFormatter = (value: number): string => this.hostPresenter.percentLabel(value);
  protected readonly bytesFormatter = (value: number): string => this.hostPresenter.bytesLabel(value);

  protected readonly overview = signal<MonitoringOverview | null>(null);
  protected readonly overviewUnavailable = signal(false);
  protected readonly history = signal<MonitoringHistory | null>(null);

  protected readonly statusCounts = computed(() => this.presenter.serviceStatusCounts(this.overview()?.services ?? []));
  protected readonly recentChanges = computed(() => this.presenter.recentChanges(this.overview()?.services ?? [], RECENT_CHANGES_LIMIT));
  protected readonly cpuPoints = computed(() => this.presenter.chartPoints(this.history()?.samples ?? [], (sample) => sample.cpuPercent));
  protected readonly memoryPoints = computed(() => this.presenter.chartPoints(this.history()?.samples ?? [], (sample) => sample.memoryUsedBytes));
  protected readonly diskPoints = computed(() => this.presenter.chartPoints(this.history()?.samples ?? [], (sample) => sample.diskUsedBytes));

  public constructor() {
    interval(OVERVIEW_REFRESH_MS).pipe(
      startWith(0),
      switchMap(() => this.monitoringApi.overview().pipe(catchError(() => {
        this.overviewUnavailable.set(true);
        return EMPTY;
      }))),
      takeUntilDestroyed()
    ).subscribe((overview) => {
      this.overviewUnavailable.set(false);
      this.overview.set(overview);
    });

    interval(HISTORY_REFRESH_MS).pipe(
      startWith(0),
      switchMap(() => this.monitoringApi.history('host', 'host', HISTORY_HOURS).pipe(catchError(() => EMPTY))),
      takeUntilDestroyed()
    ).subscribe((history) => {
      this.history.set(history);
    });
  }
}
