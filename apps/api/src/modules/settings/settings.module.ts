import { Module } from '@nestjs/common';
import { SettingsManager } from '@kiban/core';
import { DatabaseModule } from '../../database/database.module';
import { ServiceModule } from '../service/service.module';
import { DockerComposeRuntimeProvider } from '../service/providers/docker-compose-runtime.provider';
import { SettingsController } from './controllers/settings.controller';
import { SETTINGS_MANAGER } from './interfaces/settings.constants';
import { SqliteSettingsRepository } from './repositories/sqlite-settings.repository';
import { SettingsService } from './services/settings.service';

@Module({
  imports: [DatabaseModule, ServiceModule],
  controllers: [SettingsController],
  providers: [
    SqliteSettingsRepository,
    SettingsService,
    {
      provide: SETTINGS_MANAGER,
      useFactory: (repository: SqliteSettingsRepository): SettingsManager => new SettingsManager(repository),
      inject: [SqliteSettingsRepository]
    },
    {
      provide: 'INSTANCE_DOMAIN_APPLIER',
      useExisting: DockerComposeRuntimeProvider
    }
  ],
  exports: [SettingsService]
})
export class SettingsModule {}
