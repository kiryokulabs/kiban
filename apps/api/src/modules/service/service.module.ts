import { Module } from '@nestjs/common';
import { InstalledServiceManager } from '@kiban/core';
import type { CatalogRepository, RuntimeProvider } from '@kiban/core';
import { toSettingKey } from '@kiban/shared';
import { DatabaseModule } from '../../database/database.module';
import { CatalogModule } from '../catalog/catalog.module';
import { CATALOG_REPOSITORY } from '../catalog/interfaces/catalog.constants';
import { SqliteEnvironmentRepository } from '../project/repositories/sqlite-environment.repository';
import { SqliteProjectRepository } from '../project/repositories/sqlite-project.repository';
import { RuntimeController } from './controllers/runtime.controller';
import { ServiceController } from './controllers/service.controller';
import { INSTALLED_SERVICE_MANAGER, RUNTIME_PROVIDER } from './interfaces/service.constants';
import { DomainService, WILDCARD_DOMAIN_PROVIDER } from '../runtime/domain/domain.service';
import { SqliteSettingsRepository } from '../settings/repositories/sqlite-settings.repository';
import { DockerComposeTerminalProvider } from './providers/docker-compose-terminal.provider';
import { DockerComposeRuntimeProvider } from './providers/docker-compose-runtime.provider';
import { RoutedRuntimeProvider } from './providers/routed-runtime.provider';
import { SqliteInstalledServiceRepository } from './repositories/sqlite-installed-service.repository';
import { ServiceService } from './services/service.service';
import { TerminalGateway } from './terminal/terminal.gateway';
import { TerminalSessionService } from './terminal/terminal-session.service';
import { TERMINAL_PROVIDER } from './terminal/terminal.types';

@Module({
  imports: [DatabaseModule, CatalogModule],
  controllers: [ServiceController, RuntimeController],
  providers: [
    ServiceService,
    SqliteInstalledServiceRepository,
    SqliteEnvironmentRepository,
    SqliteProjectRepository,
    SqliteSettingsRepository,
    {
      provide: WILDCARD_DOMAIN_PROVIDER,
      useFactory: (settings: SqliteSettingsRepository): { getWildcardDomain(): Promise<string | null> } => ({
        getWildcardDomain: async (): Promise<string | null> => (await settings.get(toSettingKey('wildcard_domain')))?.value ?? null
      }),
      inject: [SqliteSettingsRepository]
    },
    DomainService,
    TerminalGateway,
    TerminalSessionService,
    { provide: DockerComposeRuntimeProvider, useFactory: (): DockerComposeRuntimeProvider => DockerComposeRuntimeProvider.create() },
    { provide: TERMINAL_PROVIDER, useFactory: (): DockerComposeTerminalProvider => new DockerComposeTerminalProvider() },
    { provide: RoutedRuntimeProvider, useFactory: (runtime: DockerComposeRuntimeProvider, projects: SqliteProjectRepository, domains: DomainService): RoutedRuntimeProvider => new RoutedRuntimeProvider(runtime, projects, domains), inject: [DockerComposeRuntimeProvider, SqliteProjectRepository, DomainService] },
    { provide: RUNTIME_PROVIDER, useExisting: RoutedRuntimeProvider },
    {
      provide: INSTALLED_SERVICE_MANAGER,
      useFactory: (installed: SqliteInstalledServiceRepository, environments: SqliteEnvironmentRepository, catalog: CatalogRepository, runtime: RuntimeProvider): InstalledServiceManager => new InstalledServiceManager(installed, environments, catalog, runtime),
      inject: [SqliteInstalledServiceRepository, SqliteEnvironmentRepository, CATALOG_REPOSITORY, RUNTIME_PROVIDER]
    }
  ],
  exports: [ServiceService, DockerComposeRuntimeProvider]
})
export class ServiceModule {}
