import { Module } from '@nestjs/common';
import { CatalogManager } from '@kiban/core';
import { CatalogController } from './controllers/catalog.controller';
import { CATALOG_MANAGER } from './interfaces/catalog.constants';
import { FilesystemCatalogRepository } from './repositories/filesystem-catalog.repository';
import { CatalogService } from './services/catalog.service';

@Module({
  controllers: [CatalogController],
  providers: [
    { provide: FilesystemCatalogRepository, useFactory: (): FilesystemCatalogRepository => FilesystemCatalogRepository.fromWorkspace() },
    { provide: CATALOG_MANAGER, useFactory: (repository: FilesystemCatalogRepository): CatalogManager => new CatalogManager(repository), inject: [FilesystemCatalogRepository] },
    CatalogService
  ],
  exports: [CatalogService]
})
export class CatalogModule {}
