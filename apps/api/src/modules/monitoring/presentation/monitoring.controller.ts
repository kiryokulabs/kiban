import { Controller, Get, Query } from '@nestjs/common';
import { MonitoringHistoryService } from '../application/monitoring-history.service';
import type { MonitoringHistory, MonitoringOverview } from '../application/monitoring.models';
import { MonitoringOverviewService } from '../application/monitoring-overview.service';

const DEFAULT_HISTORY_HOURS = 24;

@Controller('monitoring')
export class MonitoringController {
  public constructor(
    private readonly overviewService: MonitoringOverviewService,
    private readonly historyService: MonitoringHistoryService
  ) {}

  /** Returns the current monitoring overview for the Kiban installation. */
  @Get('overview')
  public overview(): Promise<MonitoringOverview> {
    return this.overviewService.getOverview();
  }

  /** Returns historical monitoring samples for one scope and resource. */
  @Get('history')
  public history(@Query('scope') scope: string, @Query('resourceId') resourceId: string, @Query('hours') hours?: string): Promise<MonitoringHistory> {
    return this.historyService.getHistory(scope ?? '', resourceId ?? '', this.parseHours(hours));
  }

  private parseHours(raw: string | undefined): number {
    if (raw === undefined) return DEFAULT_HISTORY_HOURS;
    return Number(raw);
  }
}
