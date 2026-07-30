import { Module } from '@nestjs/common';
import { InstalledServiceManager } from '@kiban/core';
import { DatabaseModule } from '../../database/database.module';
import { FilesystemCatalogRepository } from '../catalog/repositories/filesystem-catalog.repository';
import { SqliteEnvironmentRepository } from '../project/repositories/sqlite-environment.repository';
import { RuntimeController } from './controllers/runtime.controller';
import { ServiceController } from './controllers/service.controller';
import { INSTALLED_SERVICE_MANAGER, RUNTIME_PROVIDER } from './interfaces/service.constants';
import { DockerRuntimeProvider } from './providers/docker-runtime.provider';
import { SqliteInstalledServiceRepository } from './repositories/sqlite-installed-service.repository';
import { ServiceService } from './services/service.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ServiceController, RuntimeController],
  providers: [
    ServiceService,
    SqliteInstalledServiceRepository,
    SqliteEnvironmentRepository,
    { provide: FilesystemCatalogRepository, useFactory: (): FilesystemCatalogRepository => FilesystemCatalogRepository.fromWorkspace() },
    { provide: DockerRuntimeProvider, useFactory: (): DockerRuntimeProvider => DockerRuntimeProvider.create() },
    { provide: RUNTIME_PROVIDER, useExisting: DockerRuntimeProvider },
    {
      provide: INSTALLED_SERVICE_MANAGER,
      useFactory: (installed: SqliteInstalledServiceRepository, environments: SqliteEnvironmentRepository, catalog: FilesystemCatalogRepository, runtime: DockerRuntimeProvider): InstalledServiceManager => new InstalledServiceManager(installed, environments, catalog, runtime),
      inject: [SqliteInstalledServiceRepository, SqliteEnvironmentRepository, FilesystemCatalogRepository, RUNTIME_PROVIDER]
    }
  ],
  exports: [ServiceService]
})
export class ServiceModule {}
