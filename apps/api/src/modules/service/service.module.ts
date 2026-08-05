import { Module } from '@nestjs/common';
import { InstalledServiceManager } from '@kiban/core';
import type { CatalogRepository, RuntimeProvider } from '@kiban/core';
import { DatabaseModule } from '../../database/database.module';
import { CatalogModule } from '../catalog/catalog.module';
import { CATALOG_REPOSITORY } from '../catalog/interfaces/catalog.constants';
import { SqliteEnvironmentRepository } from '../project/repositories/sqlite-environment.repository';
import { SqliteProjectRepository } from '../project/repositories/sqlite-project.repository';
import { RuntimeController } from './controllers/runtime.controller';
import { ServiceController } from './controllers/service.controller';
import { INSTALLED_SERVICE_MANAGER, RUNTIME_PROVIDER } from './interfaces/service.constants';
import { DomainService } from '../runtime/domain/domain.service';
import { DockerComposeRuntimeProvider } from './providers/docker-compose-runtime.provider';
import { RoutedRuntimeProvider } from './providers/routed-runtime.provider';
import { SqliteInstalledServiceRepository } from './repositories/sqlite-installed-service.repository';
import { ServiceService } from './services/service.service';

@Module({
  imports: [DatabaseModule, CatalogModule],
  controllers: [ServiceController, RuntimeController],
  providers: [
    ServiceService,
    SqliteInstalledServiceRepository,
    SqliteEnvironmentRepository,
    SqliteProjectRepository,
    DomainService,
    { provide: DockerComposeRuntimeProvider, useFactory: (): DockerComposeRuntimeProvider => DockerComposeRuntimeProvider.create() },
    { provide: RoutedRuntimeProvider, useFactory: (runtime: DockerComposeRuntimeProvider, projects: SqliteProjectRepository, domains: DomainService): RoutedRuntimeProvider => new RoutedRuntimeProvider(runtime, projects, domains), inject: [DockerComposeRuntimeProvider, SqliteProjectRepository, DomainService] },
    { provide: RUNTIME_PROVIDER, useExisting: RoutedRuntimeProvider },
    {
      provide: INSTALLED_SERVICE_MANAGER,
      useFactory: (installed: SqliteInstalledServiceRepository, environments: SqliteEnvironmentRepository, catalog: CatalogRepository, runtime: RuntimeProvider): InstalledServiceManager => new InstalledServiceManager(installed, environments, catalog, runtime),
      inject: [SqliteInstalledServiceRepository, SqliteEnvironmentRepository, CATALOG_REPOSITORY, RUNTIME_PROVIDER]
    }
  ],
  exports: [ServiceService]
})
export class ServiceModule {}
