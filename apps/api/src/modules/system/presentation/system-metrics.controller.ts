import { Controller, Get } from '@nestjs/common';
import { SystemMetricsService, type SystemMetrics } from '../application/system-metrics.service';

@Controller('system')
export class SystemMetricsController {
  public constructor(private readonly service: SystemMetricsService) {}

  /** Returns host CPU, memory and disk usage for the Kiban installation. */
  @Get('metrics')
  public async getMetrics(): Promise<SystemMetrics> {
    return this.service.getMetrics();
  }
}
