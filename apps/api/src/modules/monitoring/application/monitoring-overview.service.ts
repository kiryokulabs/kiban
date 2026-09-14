import { Inject, Injectable } from '@nestjs/common';
import type { InstalledServiceManager } from '@kiban/core';
import { SystemMetricsService } from '../../system/application/system-metrics.service';
import { INSTALLED_SERVICE_MANAGER } from '../../service/interfaces/service.constants';
import { FLEET_STATS_PROVIDER, type FleetStatsProvider } from './fleet-stats.provider';
import { evaluateAlerts } from './monitoring-alerts.evaluator';
import { mapServiceRuntimeMetrics } from './monitoring-metrics.mapper';
import type { FleetStats, MonitoringOverview } from './monitoring.models';

/** Composes host metrics, service runtime metrics and alerts into one monitoring overview. */
@Injectable()
export class MonitoringOverviewService {
  /** How long fleet stats stay cached before hitting the runtime engine again. */
  public static readonly FLEET_CACHE_TTL_MS = 10_000;

  private fleetCache: { readonly stats: FleetStats; readonly expiresAt: number } | null = null;

  public constructor(
    private readonly systemMetrics: SystemMetricsService,
    @Inject(INSTALLED_SERVICE_MANAGER) private readonly services: InstalledServiceManager,
    @Inject(FLEET_STATS_PROVIDER) private readonly fleet: FleetStatsProvider
  ) {}

  /** Returns the current monitoring overview for the Kiban installation. */
  public async getOverview(): Promise<MonitoringOverview> {
    const now = new Date();
    if (!this.fleetCache || this.fleetCache.expiresAt <= now.getTime()) {
      this.fleetCache = { stats: await this.fleet.getFleetStats(), expiresAt: now.getTime() + MonitoringOverviewService.FLEET_CACHE_TTL_MS };
    }
    const [host, services] = await Promise.all([
      this.systemMetrics.getMetrics(),
      this.services.listAll()
    ]);
    const fleet = this.fleetCache.stats;
    const serviceMetrics = mapServiceRuntimeMetrics(services, fleet, now);
    return {
      host,
      services: serviceMetrics,
      alerts: evaluateAlerts(host, serviceMetrics),
      runtimeAvailable: fleet.available
    };
  }
}
