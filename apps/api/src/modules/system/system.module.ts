import os from 'node:os';
import { Module } from '@nestjs/common';
import { createKibanPaths } from '@kiban/config';
import { SystemMetricsService, SYSTEM_METRICS_PROVIDER } from './application/system-metrics.service';
import { NodeSystemMetricsProvider } from './infrastructure/node-system-metrics.provider';
import { SystemMetricsController } from './presentation/system-metrics.controller';

@Module({
  controllers: [SystemMetricsController],
  providers: [
    SystemMetricsService,
    {
      provide: SYSTEM_METRICS_PROVIDER,
      useFactory: (): NodeSystemMetricsProvider => new NodeSystemMetricsProvider(createKibanPaths(os.homedir()).root)
    }
  ]
})
export class SystemModule {}
