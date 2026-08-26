import os from 'node:os';
import { Module } from '@nestjs/common';
import { createKibanPaths } from '@kiban/config';
import { SystemMetricsService, SYSTEM_METRICS_PROVIDER } from './application/system-metrics.service';
import { SystemVersionService, SYSTEM_VERSION_PROVIDER } from './application/system-version.service';
import { NodeSystemMetricsProvider } from './infrastructure/node-system-metrics.provider';
import { ReleaseVersionProvider } from './infrastructure/release-version.provider';
import { SystemMetricsController } from './presentation/system-metrics.controller';
import { SystemVersionController } from './presentation/system-version.controller';

@Module({
  controllers: [SystemMetricsController, SystemVersionController],
  providers: [
    SystemMetricsService,
    SystemVersionService,
    {
      provide: SYSTEM_METRICS_PROVIDER,
      useFactory: (): NodeSystemMetricsProvider => new NodeSystemMetricsProvider(createKibanPaths(os.homedir()).root)
    },
    {
      provide: SYSTEM_VERSION_PROVIDER,
      useFactory: (): ReleaseVersionProvider => new ReleaseVersionProvider(`${createKibanPaths(os.homedir()).root}/runtime/kiban`)
    }
  ]
})
export class SystemModule {}
