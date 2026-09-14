import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { MONITORING_REPOSITORY, type MonitoringRepository } from './monitoring-repository';
import type { MonitoringHistory, MonitoringScope } from './monitoring.models';

const MS_PER_HOUR = 60 * 60 * 1000;

/** Reads historical monitoring samples for charts and diagnostics. */
@Injectable()
export class MonitoringHistoryService {
  /** Maximum number of points returned for one history query. */
  public static readonly MAX_HISTORY_POINTS = 600;
  /** Maximum history range in hours, aligned with the retention window. */
  public static readonly MAX_HISTORY_HOURS = 24;

  public constructor(@Inject(MONITORING_REPOSITORY) private readonly repository: MonitoringRepository) {}

  /** Returns the stored samples for one scope and resource over the last hours. */
  public async getHistory(scope: string, resourceId: string, hours: number): Promise<MonitoringHistory> {
    const normalizedScope = scope.trim() as MonitoringScope;
    if (normalizedScope !== 'host' && normalizedScope !== 'service') throw new BadRequestException('Scope must be either "host" or "service".');
    const normalizedResourceId = resourceId.trim();
    if (normalizedResourceId.length === 0) throw new BadRequestException('A resource id is required.');
    if (!Number.isInteger(hours) || hours < 1 || hours > MonitoringHistoryService.MAX_HISTORY_HOURS) {
      throw new BadRequestException(`Hours must be a whole number between 1 and ${MonitoringHistoryService.MAX_HISTORY_HOURS}.`);
    }
    const since = new Date(Date.now() - hours * MS_PER_HOUR);
    const samples = await this.repository.listHistory(normalizedScope, normalizedResourceId, since, MonitoringHistoryService.MAX_HISTORY_POINTS);
    return { scope: normalizedScope, resourceId: normalizedResourceId, samples };
  }
}
