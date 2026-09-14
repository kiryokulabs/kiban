import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { InstalledServiceManager } from '@kiban/core';
import { SystemMetricsService } from '../../system/application/system-metrics.service';
import { INSTALLED_SERVICE_MANAGER } from '../../service/interfaces/service.constants';
import { FLEET_STATS_PROVIDER, type FleetStatsProvider } from './fleet-stats.provider';
import { hostMonitoringSample, mapServiceRuntimeMetrics, serviceMonitoringSamples } from './monitoring-metrics.mapper';
import { MONITORING_REPOSITORY, type MonitoringRepository } from './monitoring-repository';

const MS_PER_HOUR = 60 * 60 * 1000;

/** Captures monitoring samples in the background and applies the retention policy. */
@Injectable()
export class MonitoringSamplerService implements OnModuleInit, OnModuleDestroy {
  /** How often a monitoring sample is captured. */
  public static readonly SAMPLE_INTERVAL_MS = 60_000;
  /** How often the retention policy runs. */
  public static readonly RETENTION_INTERVAL_MS = 3_600_000;
  /** How many hours of samples are kept. */
  public static readonly RETENTION_HOURS = 24;

  private readonly logger = new Logger(MonitoringSamplerService.name);
  private sampleTimer: ReturnType<typeof setInterval> | null = null;
  private retentionTimer: ReturnType<typeof setInterval> | null = null;

  public constructor(
    private readonly systemMetrics: SystemMetricsService,
    @Inject(INSTALLED_SERVICE_MANAGER) private readonly services: InstalledServiceManager,
    @Inject(FLEET_STATS_PROVIDER) private readonly fleet: FleetStatsProvider,
    @Inject(MONITORING_REPOSITORY) private readonly repository: MonitoringRepository
  ) {}

  /** Starts background sampling when the API boots. */
  public onModuleInit(): void {
    this.start();
  }

  /** Stops background sampling when the API shuts down. */
  public onModuleDestroy(): void {
    this.stop();
  }

  /** Starts the sampling and retention intervals. */
  public start(): void {
    if (this.sampleTimer) return;
    this.sampleTimer = setInterval(() => { void this.sampleOnce(); }, MonitoringSamplerService.SAMPLE_INTERVAL_MS);
    this.retentionTimer = setInterval(() => { void this.runRetention(); }, MonitoringSamplerService.RETENTION_INTERVAL_MS);
  }

  /** Stops the sampling and retention intervals. */
  public stop(): void {
    if (this.sampleTimer) clearInterval(this.sampleTimer);
    if (this.retentionTimer) clearInterval(this.retentionTimer);
    this.sampleTimer = null;
    this.retentionTimer = null;
  }

  /** Captures one host sample and one sample per running service. Never throws. */
  public async sampleOnce(): Promise<void> {
    try {
      const capturedAt = new Date();
      const [host, services, fleet] = await Promise.all([
        this.systemMetrics.getMetrics(),
        this.services.listAll(),
        this.fleet.getFleetStats()
      ]);
      const serviceMetrics = mapServiceRuntimeMetrics(services, fleet, capturedAt);
      const runningServiceSamples = serviceMonitoringSamples(serviceMetrics.filter((service) => service.runningContainers > 0), capturedAt);
      await this.repository.insertSamples([hostMonitoringSample(host, capturedAt), ...runningServiceSamples]);
    } catch (error: unknown) {
      this.logger.warn(`Monitoring sample failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Deletes samples older than the retention window. Never throws. */
  public async runRetention(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - MonitoringSamplerService.RETENTION_HOURS * MS_PER_HOUR);
      await this.repository.deleteOlderThan(cutoff);
    } catch (error: unknown) {
      this.logger.warn(`Monitoring retention failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
