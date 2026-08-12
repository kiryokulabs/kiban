import { Module } from '@nestjs/common';
import { CatalogManager } from '@kiban/core';
import type { CatalogRepository } from '@kiban/core';
import { CatalogController } from './controllers/catalog.controller';
import { CATALOG_MANAGER, CATALOG_REPOSITORY } from './interfaces/catalog.constants';
import { CatalogLoader } from './loader/catalog.loader';
import { CatalogLoaderRepository } from './loader/catalog-loader.repository';
import { CatalogService } from './services/catalog.service';

@Module({
  controllers: [CatalogController],
  providers: [
    {
      provide: CatalogLoader,
      useFactory: (): CatalogLoader => CatalogLoader.fromWorkspace()
    },
    {
      provide: CatalogLoaderRepository,
      useFactory: (loader: CatalogLoader): CatalogLoaderRepository => new CatalogLoaderRepository(loader),
      inject: [CatalogLoader]
    },
    {
      provide: CATALOG_REPOSITORY,
      useExisting: CatalogLoaderRepository
    },
    {
      provide: CATALOG_MANAGER,
      useFactory: (repository: CatalogRepository): CatalogManager => new CatalogManager(repository),
      inject: [CATALOG_REPOSITORY]
    },
    CatalogService
  ],
  exports: [CatalogService, CATALOG_REPOSITORY]
})
export class CatalogModule {}
