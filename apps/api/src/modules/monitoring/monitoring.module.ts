import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { ServiceModule } from '../service/service.module';
import { SystemModule } from '../system/system.module';
import { FLEET_STATS_PROVIDER } from './application/fleet-stats.provider';
import { MonitoringHistoryService } from './application/monitoring-history.service';
import { MonitoringOverviewService } from './application/monitoring-overview.service';
import { MONITORING_REPOSITORY } from './application/monitoring-repository';
import { MonitoringSamplerService } from './application/monitoring-sampler.service';
import { DockerComposeFleetStatsProvider } from './infrastructure/docker-compose-fleet-stats.provider';
import { SqliteMonitoringRepository } from './infrastructure/sqlite-monitoring.repository';
import { MonitoringController } from './presentation/monitoring.controller';

@Module({
  imports: [DatabaseModule, SystemModule, ServiceModule],
  controllers: [MonitoringController],
  providers: [
    MonitoringOverviewService,
    MonitoringHistoryService,
    MonitoringSamplerService,
    DockerComposeFleetStatsProvider,
    SqliteMonitoringRepository,
    { provide: MONITORING_REPOSITORY, useExisting: SqliteMonitoringRepository },
    { provide: FLEET_STATS_PROVIDER, useExisting: DockerComposeFleetStatsProvider }
  ]
})
export class MonitoringModule {}
